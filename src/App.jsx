import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Settings, Home, Plus, Star, ChevronLeft, Trash2, Pencil, Check, X, Phone, Calendar, CheckCircle, LogOut, GripVertical, Flag } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useFirestore } from './useFirestore';
import Login from './Login';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const defaultCriteria = [
    '家から近い',
    '施設が新しい',
    '園庭が広い',
    '連絡帳がアプリ',
    '役員（父母会）がない',
    '購入備品が少ない'
  ];

  if (isAuthLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-rose-50">
        <span className="text-4xl animate-bounce leading-none" role="img" aria-label="koala">🐨</span>
        <p className="text-rose-400 font-bold mt-4 animate-pulse">データを準備中...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <MainApp user={user} defaultCriteria={defaultCriteria} />;
}

function MainApp({ user, defaultCriteria }) {
  const [criteria, setCriteria, criteriaLoading] = useFirestore('hoikuen-criteria-v2', defaultCriteria, user);
  const [schools, setSchools, schoolsLoading] = useFirestore('hoikuen-schools', [], user);
  const [importantCriteria, setImportantCriteria, importantLoading] = useFirestore('hoikuen-important-criteria', [], user);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'settings', 'detail'
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollContainerRef = useRef(null);

  // Helper to calculate total score
  const calculateTotalScore = (scores) => {
    return criteria.reduce((sum, criterion) => sum + (scores[criterion] || 0), 0);
  };

  const scrollToView = (view) => {
    setCurrentView(view);
    if (view !== 'detail' && scrollContainerRef.current) {
      const width = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: view === 'settings' ? width : 0,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = (e) => {
    if (currentView === 'detail') return;
    const el = e.target;
    if (!el.clientWidth) return;
    
    const width = el.clientWidth;
    const scrollLeft = el.scrollLeft;
    const newView = scrollLeft > width / 2 ? 'settings' : 'list';
    
    setCurrentView((prev) => {
      if (prev === 'detail') return prev;
      return newView;
    });
  };

  if (criteriaLoading || schoolsLoading || importantLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#fffbfa]">
        <div className="w-8 h-8 border-4 border-rose-300 border-t-rose-500 rounded-full animate-spin"></div>
        <p className="text-rose-400 font-bold mt-4">クラウドと同期中...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    if (window.confirm("ログアウトしますか？")) {
      await signOut(auth);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#fffbfa] font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 p-4 sticky top-0 z-40 flex items-center justify-between">
        {currentView === 'detail' ? (
          <button onClick={() => setCurrentView('list')} className="p-2 -ml-2 text-rose-500 hover:text-rose-600 transition-colors">
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="w-8"></div>
        )}
        <h1 className="text-xl font-bold text-center flex-1 transition-all duration-300">
          {currentView === 'list' && '保育園見学ノート'}
          {currentView === 'settings' && '評価項目の設定'}
          {currentView === 'detail' && '保育園の評価'}
        </h1>
        <div className="w-8">
          {currentView !== 'detail' && (
             <button onClick={handleLogout} className="p-2 -mr-2 text-gray-300 hover:text-rose-500 transition-colors">
               <LogOut size={20} />
             </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-gray-50/30">
        
        {/* Swipeable List & Settings Containers */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex w-full h-full snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDragging ? 'overflow-hidden touch-none' : 'overflow-x-auto'}`}
        >
          {/* List View */}
          <div className="w-full h-full shrink-0 snap-center overflow-y-auto pb-24 p-4">
            <ListView 
              schools={schools} 
              setSchools={setSchools} 
              criteria={criteria} 
              setCurrentView={setCurrentView} 
              setSelectedSchoolId={setSelectedSchoolId}
              calculateTotalScore={calculateTotalScore}
            />
          </div>
          
          {/* Settings View */}
          <div className="w-full h-full shrink-0 snap-center overflow-y-auto pb-24 p-4">
            <SettingsView 
              criteria={criteria} 
              setCriteria={setCriteria} 
              schools={schools} 
              setSchools={setSchools} 
              importantCriteria={importantCriteria}
              setImportantCriteria={setImportantCriteria}
              setIsDragging={setIsDragging}
            />
          </div>
        </div>

        {/* Detail View Overlay (Slides in from right) */}
        <div 
          className={`absolute top-0 left-0 w-full h-full bg-[#fffbfa] z-20 overflow-y-auto pb-24 p-4 shadow-2xl transition-transform duration-300 ease-in-out ${
            currentView === 'detail' ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {currentView === 'detail' && (
            <DetailView 
              schools={schools} 
              setSchools={setSchools} 
              criteria={criteria}
              importantCriteria={importantCriteria} 
              selectedSchoolId={selectedSchoolId} 
              calculateTotalScore={calculateTotalScore}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around p-2 pb-safe z-30 transition-transform duration-300 ${currentView === 'detail' ? 'translate-y-full' : 'translate-y-0'}`}>
        <button 
          onClick={() => scrollToView('list')} 
          className={`flex flex-col items-center p-2 flex-1 transition-colors ${currentView === 'list' ? 'text-rose-500' : 'text-gray-400'}`}
        >
          <Home size={24} className={currentView === 'list' ? 'fill-rose-100' : ''} />
          <span className="text-xs mt-1 font-bold">保育園一覧</span>
        </button>
        <button 
          onClick={() => scrollToView('settings')} 
          className={`flex flex-col items-center p-2 flex-1 transition-colors ${currentView === 'settings' ? 'text-rose-500' : 'text-gray-400'}`}
        >
          <Settings size={24} className={currentView === 'settings' ? 'fill-rose-100' : ''} />
          <span className="text-xs mt-1 font-bold">設定</span>
        </button>
      </nav>
    </div>
  );
}

// ------ School Card ------
function SchoolCard({ school, index, isRanked, calculateTotalScore, handleSchoolClick, handleDeleteSchool }) {
  const total = calculateTotalScore(school.scores);
  return (
    <div 
      onClick={() => handleSchoolClick(school.id)}
      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {isRanked ? (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm border-2 border-white ${index === 0 ? 'bg-amber-400 text-white shadow-md' : index === 1 ? 'bg-slate-300 text-white' : index === 2 ? 'bg-orange-300 text-white' : 'bg-amber-100 text-amber-700'}`}>
            {index + 1}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 bg-teal-100 text-teal-600 shadow-sm border-2 border-white">
            <Calendar size={18} />
          </div>
        )}
        <div>
          <h3 className="font-bold text-lg text-gray-800">{school.name}</h3>
          {!isRanked && (
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <div className={`px-3 py-1 rounded-full font-bold shadow-sm border ${school.visitDate ? 'bg-teal-50 text-teal-600 border-teal-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                {school.visitDate ? `📅 ${school.visitDate.replace('T', ' ')}` : '😴 未定'}
              </div>
              {school.phoneNumber && (
                <a 
                  href={`tel:${school.phoneNumber.replace(/[^\d]/g, '')}`} 
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center text-white bg-teal-400 hover:bg-teal-500 w-10 h-10 rounded-full shadow-md transition-transform active:scale-90 ml-2"
                >
                  <Phone size={20} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pl-2">
        {isRanked && (
          <div className="text-right">
            <div className="text-xs text-gray-500">総合得点</div>
            <div className="text-xl font-extrabold text-amber-500 leading-none">{total} <span className="text-sm font-normal text-gray-400">pt</span></div>
          </div>
        )}
        <button onClick={(e) => handleDeleteSchool(school.id, e)} className="text-gray-300 hover:text-red-500 p-2 -mr-2">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

// ------ List View ------
function ListView({ schools, setSchools, criteria, setCurrentView, setSelectedSchoolId, calculateTotalScore }) {
  const [newSchoolName, setNewSchoolName] = useState('');

  const sortedSchools = useMemo(() => {
    return [...schools]
      .filter(s => s.isVisited)
      .sort((a, b) => calculateTotalScore(b.scores) - calculateTotalScore(a.scores));
  }, [schools, criteria]);

  const scheduledSchools = useMemo(() => {
    return [...schools].sort((a, b) => {
      const getGroup = (s) => {
        if (s.isVisited) return 3; // 見学が終わった
        if (!s.visitDate) return 2; // 未定
        return 1; // 予定あり（近日中）
      };
      
      const groupA = getGroup(a);
      const groupB = getGroup(b);
      
      if (groupA !== groupB) return groupA - groupB;
      
      if (groupA === 1) {
        const tA = new Date(a.visitDate).getTime();
        const tB = new Date(b.visitDate).getTime();
        return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
      }
      
      // グループ2, 3の内部ソートは登録順（維持）
      return 0;
    });
  }, [schools]);

  const handleAddSchool = (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    const newSchool = {
      id: Date.now().toString(),
      name: newSchoolName.trim(),
      scores: {},
      memos: {}
    };
    setSchools([...schools, newSchool]);
    setNewSchoolName('');
  };

  const handleSchoolClick = (id) => {
    setSelectedSchoolId(id);
    setCurrentView('detail');
  };

  const handleDeleteSchool = (id, e) => {
    e.stopPropagation();
    if (window.confirm("この保育園を削除しますか？")) {
      setSchools(schools.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleAddSchool} className="flex gap-2">
        <input 
          type="text" 
          placeholder="見学したい保育園の名前" 
          value={newSchoolName}
          onChange={(e) => setNewSchoolName(e.target.value)}
          className="flex-1 border-2 border-rose-100 rounded-xl p-3 focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 shadow-sm transition-all text-gray-700"
        />
        <button type="submit" className="bg-rose-400 text-white p-3 rounded-xl shadow-md font-bold flex items-center hover:bg-rose-500 transition-colors">
          <Plus size={20} />
          <span className="ml-1">追加</span>
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-bold text-teal-700 border-b-2 border-teal-200 pb-2 flex items-center gap-2">
          <Calendar size={18} className="text-teal-500 fill-teal-100" />
          見学する保育園一覧
        </h2>
        {scheduledSchools.length === 0 ? (
          <p className="text-center text-gray-500 py-6">見学予定の保育園はありません</p>
        ) : (
          scheduledSchools.map((school, index) => (
            <SchoolCard 
              key={`sched-${school.id}`}
              school={school}
              index={index}
              isRanked={false}
              calculateTotalScore={calculateTotalScore}
              handleSchoolClick={handleSchoolClick}
              handleDeleteSchool={handleDeleteSchool}
            />
          ))
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-amber-600 border-b-2 border-amber-200 pb-2 flex items-center gap-2">
          <Star size={18} className="text-amber-500 fill-amber-100" />
          総合ランキング（見学済み）
        </h2>
        {sortedSchools.length === 0 ? (
          <p className="text-center text-gray-500 mt-10">見学を終えるとこちらに表示されます</p>
        ) : (
          sortedSchools.map((school, index) => (
            <SchoolCard 
              key={`rank-${school.id}`}
              school={school}
              index={index}
              isRanked={true}
              calculateTotalScore={calculateTotalScore}
              handleSchoolClick={handleSchoolClick}
              handleDeleteSchool={handleDeleteSchool}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ------ Settings View ------
function SettingsView({ criteria, setCriteria, schools, setSchools, importantCriteria, setImportantCriteria, setIsDragging }) {
  const [newCriterion, setNewCriterion] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = () => {
    if (setIsDragging) setIsDragging(true);
  };

  const handleDragEnd = (event) => {
    if (setIsDragging) setIsDragging(false);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = criteria.indexOf(active.id);
      const newIndex = criteria.indexOf(over.id);
      const moved = arrayMove(criteria, oldIndex, newIndex);

      const isItemImportant = importantCriteria.includes(active.id);
      const numImportant = importantCriteria.length;
      let newImportant = [...importantCriteria];
      
      if (isItemImportant && newIndex >= numImportant) {
        newImportant = newImportant.filter(c => c !== active.id);
        setImportantCriteria(newImportant);
      } else if (!isItemImportant && newIndex < numImportant) {
        newImportant.push(active.id);
        setImportantCriteria(newImportant);
      }

      const important = [];
      const normal = [];
      for (const c of moved) {
        if (newImportant.includes(c)) important.push(c);
        else normal.push(c);
      }
      setCriteria([...important, ...normal]);
    }
  };

  const handleDragCancel = () => {
    if (setIsDragging) setIsDragging(false);
  };

  const toggleImportant = (criterion) => {
    let newImportant;
    if (importantCriteria.includes(criterion)) {
      newImportant = importantCriteria.filter(c => c !== criterion);
    } else {
      newImportant = [...importantCriteria, criterion];
    }
    setImportantCriteria(newImportant);

    const important = [];
    const normal = [];
    for (const c of criteria) {
      if (newImportant.includes(c)) important.push(c);
      else normal.push(c);
    }
    setCriteria([...important, ...normal]);
  };

  const handleAddCriterion = (e) => {
    e.preventDefault();
    if (!newCriterion.trim() || criteria.includes(newCriterion.trim())) return;
    setCriteria([...criteria, newCriterion.trim()]);
    setNewCriterion('');
  };

  const handleRemoveCriterion = (criterionToRemove) => {
    if (window.confirm(`「${criterionToRemove}」を削除しますか？`)) {
      setCriteria(criteria.filter(c => c !== criterionToRemove));
      if (importantCriteria.includes(criterionToRemove)) {
        setImportantCriteria(importantCriteria.filter(c => c !== criterionToRemove));
      }
    }
  };

  const startEdit = (index, currentVal) => {
    setEditingIndex(index);
    setEditValue(currentVal);
  };

  const saveEdit = (index, oldVal) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === oldVal) {
      setEditingIndex(null);
      return;
    }
    if (criteria.includes(trimmed) && criteria.indexOf(trimmed) !== index) {
      alert('その項目は既に存在します。');
      return;
    }

    // Update criteria array
    const newCriteria = [...criteria];
    newCriteria[index] = trimmed;
    setCriteria(newCriteria);

    // Update all schools' scores and memos to reflect the new key
    const updatedSchools = schools.map(school => {
      const newScores = { ...school.scores };
      const newMemos = { ...school.memos };
      
      if (newScores[oldVal] !== undefined) {
        newScores[trimmed] = newScores[oldVal];
        delete newScores[oldVal];
      }
      if (newMemos[oldVal] !== undefined) {
        newMemos[trimmed] = newMemos[oldVal];
        delete newMemos[oldVal];
      }
      return { ...school, scores: newScores, memos: newMemos };
    });
    setSchools(updatedSchools);
    
    // Update importantCriteria if renamed
    if (importantCriteria.includes(oldVal)) {
      setImportantCriteria(importantCriteria.map(c => c === oldVal ? trimmed : c));
    }

    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddCriterion} className="flex gap-2 relative z-10">
        <input 
          type="text" 
          placeholder="例：アレルギー対応してくれる" 
          value={newCriterion}
          onChange={(e) => setNewCriterion(e.target.value)}
          className="flex-1 border-2 border-rose-100 rounded-xl p-3 focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 shadow-sm transition-all text-gray-700"
        />
        <button type="submit" className="bg-rose-400 text-white p-3 rounded-xl shadow-md font-bold flex items-center hover:bg-rose-500 transition-colors">
          <Plus size={20} />
          <span className="ml-1">追加</span>
        </button>
      </form>

      {/* 吹き出し */}
      <div className="relative mt-4 mb-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-600 text-[13px] font-bold text-center shadow-sm animate-in fade-in zoom-in duration-300">
        <div className="absolute -bottom-[6px] right-[84px] w-3 h-3 bg-rose-50 border-b border-r border-rose-200 transform rotate-45"></div>
        💡 特に重要な項目は 🚩 をタップ！
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <SortableContext items={criteria} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2 pb-6">
            {criteria.map((criterion, index) => (
              <SortableCriterionItem
                key={criterion}
                id={criterion}
                criterion={criterion}
                index={index}
                editingIndex={editingIndex}
                editValue={editValue}
                setEditValue={setEditValue}
                startEdit={startEdit}
                saveEdit={saveEdit}
                setEditingIndex={setEditingIndex}
                handleRemoveCriterion={handleRemoveCriterion}
                isImportant={importantCriteria?.includes(criterion)}
                toggleImportant={toggleImportant}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableCriterionItem({ id, criterion, index, editingIndex, editValue, setEditValue, startEdit, saveEdit, setEditingIndex, handleRemoveCriterion, isImportant, toggleImportant }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className={`bg-white p-3 rounded-xl border flex items-center justify-between relative ${isDragging ? 'border-amber-300 shadow-lg scale-105 opacity-90' : 'border-gray-100 shadow-sm'}`}>
      <div {...attributes} {...listeners} className="p-2 -ml-2 text-gray-300 active:text-rose-400 touch-none">
        <GripVertical size={20} />
      </div>
      
      {editingIndex === index ? (
        <div className="flex-1 flex gap-2 mr-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 border-b-2 border-rose-400 bg-rose-50 p-1 focus:outline-none font-bold text-rose-700 rounded-t-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit(index, criterion);
              if (e.key === 'Escape') setEditingIndex(null);
            }}
          />
          <button onClick={() => saveEdit(index, criterion)} className="text-green-500 p-1 hover:bg-green-50 rounded">
            <Check size={20} />
          </button>
          <button onClick={() => setEditingIndex(null)} className="text-gray-400 p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>
      ) : (
        <>
          <span className="font-medium text-gray-800 flex-1 ml-1">{criterion}</span>
          <div className="flex items-center">
            <button onClick={() => toggleImportant(criterion)} className="text-gray-400 p-2 transition-colors">
              <Flag size={20} className={isImportant ? 'fill-rose-400 text-rose-400' : 'text-gray-300'} />
            </button>
            <button onClick={() => startEdit(index, criterion)} className="text-gray-400 hover:text-indigo-500 p-2 transition-colors">
              <Pencil size={20} />
            </button>
            <button onClick={() => handleRemoveCriterion(criterion)} className="text-gray-400 hover:text-red-500 p-2 transition-colors ml-1">
              <Trash2 size={20} />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

// ------ Detail View ------
function DetailView({ schools, setSchools, criteria, importantCriteria, selectedSchoolId, calculateTotalScore }) {
  const schoolIndex = schools.findIndex(s => s.id === selectedSchoolId);
  if (schoolIndex === -1) return <div>Data not found</div>;
  
  const school = schools[schoolIndex];
  const totalScore = calculateTotalScore(school.scores);

  const updateSchool = (updatedSchool) => {
    const newSchools = [...schools];
    newSchools[schoolIndex] = updatedSchool;
    setSchools(newSchools);
  };

  const setScore = (criterion, score) => {
    updateSchool({
      ...school,
      scores: { ...school.scores, [criterion]: score }
    });
  };

  const setMemo = (criterion, memo) => {
    updateSchool({
      ...school,
      memos: { ...school.memos, [criterion]: memo }
    });
  };

  const handlePhoneBlur = (val) => {
    if (!val) return;
    let num = val.replace(/[^\d]/g, '');
    let formatted = val;
    if (num.length === 11) {
      formatted = `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
    } else if (num.length === 10) {
      if (num.startsWith('03') || num.startsWith('06')) {
        formatted = `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
      } else {
        formatted = `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6, 10)}`;
      }
    }
    if (formatted !== val) {
      updateSchool({ ...school, phoneNumber: formatted });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-gradient-to-br from-pink-400 to-rose-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 border-b border-white/30 focus-within:border-white pb-1 transition-colors">
            <input 
              type="text" 
              value={school.name}
              onChange={(e) => updateSchool({ ...school, name: e.target.value })}
              className="text-2xl font-bold bg-transparent focus:outline-none w-full text-white placeholder-white/50"
            />
            <Pencil size={20} className="text-rose-100 flex-shrink-0" />
          </div>
          <div className="text-rose-50 font-bold text-sm mb-4">総合評価</div>
          <div className="flex items-baseline gap-1 drop-shadow-sm">
            <span className="text-6xl font-black tracking-tighter">{totalScore}</span>
            <span className="text-rose-100 font-bold ml-1">/ {criteria.length * 5} pt</span>
          </div>
        </div>
        {/* Decorative background shape */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-3">基本情報</h3>
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-gray-400" />
          <div className="flex-1">
            <label className="text-xs text-gray-500 block">見学日（日時）</label>
            <input 
              type="datetime-local" 
              step="900"
              value={school.visitDate || ''}
              onChange={(e) => updateSchool({ ...school, visitDate: e.target.value })}
              className="w-full border-b-2 border-gray-200 focus:border-rose-400 bg-transparent py-1 outline-none text-gray-800 transition-colors font-medium"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone size={20} className="text-gray-400" />
          <div className="flex-1">
            <label className="text-xs text-gray-500 block">電話番号</label>
            <div className="flex gap-2">
              <input 
                type="tel" 
                placeholder="ハイフンなしで入力　例：09012345678"
                value={school.phoneNumber || ''}
                onChange={(e) => updateSchool({ ...school, phoneNumber: e.target.value })}
                onBlur={(e) => handlePhoneBlur(e.target.value)}
                className="w-full border-b-2 border-gray-200 focus:border-rose-400 bg-transparent py-1 outline-none text-gray-800 transition-colors font-medium"
              />
              {school.phoneNumber && (
                <a 
                  href={`tel:${school.phoneNumber.replace(/[^\d]/g, '')}`}
                  className="bg-rose-500 text-white shadow-sm px-3 py-1 rounded-xl text-sm font-bold flex items-center whitespace-nowrap active:scale-95 transition-transform"
                >
                  <Phone size={14} className="mr-1" />
                  発信
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 pt-4 border-t-2 border-gray-100">
          <CheckCircle size={24} className={school.isVisited ? "text-rose-500" : "text-gray-300"} />
          <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
            <input 
              type="checkbox" 
              checked={school.isVisited || false} 
              onChange={(e) => updateSchool({ ...school, isVisited: e.target.checked })}
              className="w-6 h-6 text-rose-500 rounded border-gray-300 focus:ring-rose-400 transition-colors shadow-sm"
            />
            <span className={`text-base font-bold ${school.isVisited ? "text-rose-600" : "text-gray-500"}`}>
              見学完了
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2">メモ欄</h3>
        <textarea
          placeholder="電話で言われた持ち物、気になることなど"
          value={school.generalMemo || ''}
          onChange={(e) => updateSchool({ ...school, generalMemo: e.target.value })}
          className="w-full border-2 border-rose-50 bg-rose-50/30 rounded-xl p-3 text-sm focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 focus:bg-white transition-all resize-none min-h-[100px]"
        />
      </div>

      <div className="space-y-3">
        {criteria.map(criterion => {
          const isImportant = importantCriteria?.includes(criterion);
          return (
          <div key={criterion} className={`px-4 py-3 rounded-xl shadow-sm border ${isImportant ? 'bg-rose-50 border-rose-200 shadow-md' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800 text-sm leading-tight pr-2 flex-1 flex items-center gap-1">
                {isImportant && <Flag size={14} className="fill-rose-400 text-rose-400" />}
                {criterion}
              </h3>
              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => {
                  const currentScore = school.scores[criterion] || 0;
                  const isFilled = star <= currentScore;
                  return (
                    <button 
                      key={star}
                      onClick={() => setScore(criterion, star)}
                      className="focus:outline-none transition-transform active:scale-125 p-0.5"
                    >
                      <Star 
                        size={28} 
                        className={isFilled ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Memo */}
            <textarea
              placeholder="メモなどを自由に入力..."
              value={school.memos[criterion] || ''}
              onChange={(e) => setMemo(criterion, e.target.value)}
              className="w-full border-2 border-rose-50 bg-rose-50/30 rounded-xl p-2 text-sm focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-50 focus:bg-white transition-all resize-none"
              rows={1}
            />
          </div>
        )})}
        {criteria.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            評価項目が設定されていません。評価軸設定から追加してください。
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
