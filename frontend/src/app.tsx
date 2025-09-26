import { Router, Route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import { Web3Provider } from './hooks/Web3Context';
import Header from './components/Header';
import Home from './pages/Home';
import Games from './pages/Games';
import GameDetails from './pages/GameDetails';
import Profile from './pages/Profile';
import Chatbot from './components/Chatbot';
import './app.css';

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <Web3Provider>
      <div className="app">
        <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
        <main className="main-content">
          <Router>
            <Route path="/" component={Home} />
            <Route path="/games" component={Games} />
            <Route path="/game/:gameId" component={GameDetails} />
            <Route path="/profile" component={Profile} />
          </Router>
        </main>
        <Chatbot />
      </div>
    </Web3Provider>
  );
}
