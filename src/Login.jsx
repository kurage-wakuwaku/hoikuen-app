import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // 成功時は親(App.jsx)のonAuthStateChangedが自動で検知して画面が切り替わる
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('このメールアドレスは既に登録されています。');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setError('メールアドレスかパスワードが間違っています。');
      else if (err.code === 'auth/weak-password') setError('パスワードは6文字以上にしてください。');
      else setError('エラーが発生しました: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <span className="text-3xl leading-none" role="img" aria-label="koala">🐨</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">保育園見学ノート</h1>
          <p className="text-sm text-gray-500 font-bold">
            {isLogin ? 'おかえりなさい！' : '新しくアカウントを作る'}
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-xl border border-red-200 text-center shadow-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">メールアドレス</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 border-2 border-gray-100 bg-gray-50 rounded-xl p-3 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all font-medium text-gray-800"
              required 
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">パスワード（6文字以上）</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border-2 border-gray-100 bg-gray-50 rounded-xl p-3 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all font-medium text-gray-800"
              required 
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className={`w-full text-white font-bold py-3.5 rounded-xl shadow-md transition-all text-lg mt-2 ${isLoading ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 active:scale-[0.98]'}`}
          >
            {isLoading ? '処理中...' : (isLogin ? 'ログイン' : 'はじめる（無料）')}
          </button>
        </form>

        <div className="text-center pt-5 border-t border-gray-100">
          <button 
            type="button" 
            onClick={() => {setIsLogin(!isLogin); setError('');}}
            className="text-sm font-bold text-gray-400 hover:text-rose-500 transition-colors py-2 px-4 rounded-full hover:bg-rose-50"
            disabled={isLoading}
          >
            {isLogin ? '初めての方はこちら (新規登録)' : 'すでにアカウントをお持ちの方 (ログイン)'}
          </button>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-rose-300 font-bold">
        家族とURLを共有し、同じ情報でログインすることで<br/>リアルタイムにデータを共有できます！
      </div>
    </div>
  );
}
