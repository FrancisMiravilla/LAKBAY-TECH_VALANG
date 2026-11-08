import { useEffect, useState } from 'react';
import { Trophy, Crown, RefreshCw } from 'lucide-react';
import qrService from './api/qrService';
import mandoImg from './assets/characters/lila.jpg';
import belaImg from './assets/characters/new.jpg';
import lilaImg from './assets/characters/ricky.jpg';
import danteImg from './assets/characters/dante.jpg';
import sonyaImg from './assets/characters/sonya.jpg';
import './DashboardLeaderboard.css';

// Same id → portrait mapping as the mobile app (constants/characters.js).
const CHARACTERS = {
  mando: { name: 'Kuya Mando', image: mandoImg },
  bela: { name: 'Ate Bela', image: belaImg },
  lila: { name: 'Ate Lila', image: lilaImg },
  dante: { name: 'Bossing Dante', image: danteImg },
  sonya: { name: 'Ate Sonya', image: sonyaImg },
};

const characterOf = (id) => CHARACTERS[String(id || '').toLowerCase().trim()] || CHARACTERS.mando;

export default function DashboardLeaderboard({ limit = 10 }) {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');

  const fetchBoard = () =>
    qrService.getLeaderboard(limit)
      .then(({ data }) => {
        setPlayers(data.results || []);
        setTotal(data.total_players || 0);
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
      });

  const load = () => {
    setStatus('loading');
    fetchBoard();
  };

  useEffect(() => {
    fetchBoard();
  }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  const topXp = Math.max(1, ...players.map((p) => p.xp));

  return (
    <div className="content-card">
      <div className="content-card-header">
        <h3 className="card-title">
          <Trophy className="card-title-icon" size={18} />
          Leaderboard
        </h3>
        <div className="lb-header-meta">
          <span className="lb-total">{total.toLocaleString()} players</span>
          <button type="button" className="lb-refresh" onClick={load} title="Refresh" disabled={status === 'loading'}>
            <RefreshCw size={14} className={status === 'loading' ? 'lb-spin' : ''} />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="lb-empty">Couldn't load the leaderboard. <button type="button" className="lb-retry" onClick={load}>Try again</button></div>
      ) : status === 'loading' && players.length === 0 ? (
        <div className="lb-list">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="lb-row lb-skeleton" />)}
        </div>
      ) : players.length === 0 ? (
        <div className="lb-empty">No players yet. Tourists appear here once they set up a character and earn XP.</div>
      ) : (
        <div className="lb-list">
          {players.map((p) => {
            const ch = characterOf(p.chosen_character);
            const medal = p.rank <= 3 ? `lb-medal-${p.rank}` : '';
            return (
              <div key={p.id} className={`lb-row ${medal ? 'lb-row-top' : ''}`}>
                <div className={`lb-rank ${medal}`}>
                  {p.rank === 1 ? <Crown size={16} /> : p.rank}
                </div>
                <img className={`lb-avatar ${medal}`} src={ch.image} alt={ch.name} />
                <div className="lb-player">
                  <span className="lb-name" title={p.in_game_name}>{p.in_game_name}</span>
                  <span className="lb-sub">{ch.name}</span>
                  <div className="lb-bar"><div style={{ width: `${Math.max(4, (p.xp / topXp) * 100)}%` }} /></div>
                </div>
                <span className="lb-level">Lv {p.level}</span>
                <span className="lb-xp">{p.xp.toLocaleString()} <small>XP</small></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
