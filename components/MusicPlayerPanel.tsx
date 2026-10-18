import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Music2, ListMusic, X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Repeat1, Shuffle, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { Playlist } from '../types';
import ModalLayer from './ModalLayer';
import './MusicPlayer.css';

interface MusicPlayerPanelProps {
  theme?: { id: string };
  showCustomInput: boolean; setShowCustomInput: (v: boolean) => void;
  customVideoUrl: string; setCustomVideoUrl: (v: string) => void;
  customTrackName: string; setCustomTrackName: (v: string) => void;
  customTargetPlaylistId: string; setCustomTargetPlaylistId: (v: string) => void;
  handleAddCustomMusic: (e: React.FormEvent) => void; isAddingMusic: boolean;
  currentPlaylist: Playlist; currentTrackIndex: number; setCurrentTrackIndex: (i: number) => void;
  isPlayingMusic: boolean; toggleMusic: () => void;
  handleRemoveTrack: (e: React.MouseEvent, i: number) => void;
  playMode: 'sequential' | 'shuffle' | 'repeat_one'; togglePlayMode: () => void;
  nextTrack: () => void; prevTrack: () => void; closeMenu: () => void;
  volume: number; setVolume: (v: number) => void;
  playlists: Playlist[]; activePlaylistId: string;
  onChangePlaylist: (id: string) => void; onAddPlaylist: (name: string) => void; onDeletePlaylist: (id: string) => void;
}

const MusicPlayerPanel: React.FC<MusicPlayerPanelProps> = (props) => {
  const { currentPlaylist, currentTrackIndex, isPlayingMusic, toggleMusic, nextTrack, prevTrack, closeMenu,
    volume, setVolume, playMode, togglePlayMode, playlists, activePlaylistId, onChangePlaylist,
    onAddPlaylist, onDeletePlaylist, showCustomInput, setShowCustomInput, customVideoUrl, setCustomVideoUrl,
    customTrackName, setCustomTrackName, customTargetPlaylistId, setCustomTargetPlaylistId, handleAddCustomMusic, isAddingMusic } = props;
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const track = currentPlaylist.tracks[currentTrackIndex];
  const modeLabel = playMode === 'sequential' ? '順序播放' : playMode === 'shuffle' ? '隨機播放' : '單曲循環';
  const cover = (id?: string, size = 'mqdefault') => id ? <img src={`https://img.youtube.com/vi/${id}/${size}.jpg`} alt="" referrerPolicy="no-referrer" /> : <Music2 aria-hidden="true" />;

  return <section className="focus-music-panel" role="dialog" aria-modal="true" aria-labelledby="focus-music-title" onClick={e => e.stopPropagation()}>
    <header className="focus-music-header">
      <div><span className="focus-music-eyebrow"><Music2 size={13} /> SOUND FOR YOUR FOCUS</span><h2 id="focus-music-title">專注音樂播放器</h2><p>留一點聲音，陪你進入自己的節奏。</p></div>
      <button className="focus-music-icon" onClick={closeMenu} aria-label="關閉音樂播放器"><X size={18} /></button>
    </header>
    <div className="focus-music-layout">
      <section className="focus-music-console" aria-label="播放控制">
        <div className="focus-music-cover">{cover(track?.youtubeId, 'hqdefault')}<span>{isPlayingMusic ? 'NOW PLAYING' : 'READY TO FOCUS'}</span></div>
        <div className="focus-music-track-info"><p>{currentPlaylist.name}</p><h3 title={track?.name}>{track?.name || '尚未選擇音樂'}</h3><span>{isPlayingMusic ? '播放中，讓聲音陪伴專注' : '選一首音樂，開始你的專注時光'}</span></div>
        <div className="focus-music-controls">
          <button className="focus-music-icon" onClick={prevTrack} aria-label="上一首" disabled={!track}><SkipBack size={19} fill="currentColor" /></button>
          <button className="focus-music-play" onClick={toggleMusic} aria-label={isPlayingMusic ? '暫停音樂' : '播放音樂'} disabled={!track}>{isPlayingMusic ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" />}</button>
          <button className="focus-music-icon" onClick={nextTrack} aria-label="下一首" disabled={!track}><SkipForward size={19} fill="currentColor" /></button>
        </div>
        <div className="focus-music-volume"><button onClick={() => setVolume(volume === 0 ? 0.5 : 0)} aria-label={volume === 0 ? '取消靜音' : '靜音'}>{volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><input aria-label="音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} style={{background: `linear-gradient(to right,#9b7aaf ${volume * 100}%,#e9dfef ${volume * 100}%)`}} /><span>{Math.round(volume * 100)}%</span></div>
        <button className="focus-music-mode" onClick={togglePlayMode} aria-label={`切換播放模式，目前${modeLabel}`}>{playMode === 'shuffle' ? <Shuffle size={15} /> : playMode === 'repeat_one' ? <Repeat1 size={15} /> : <Repeat size={15} />}{modeLabel}<span>切換</span></button>
      </section>
      <section className="focus-music-library" aria-label="播放清單">
        <div className="focus-music-library-header"><div><span className="focus-music-eyebrow">YOUR COLLECTION</span><h3>播放清單 <small>{currentPlaylist.tracks.length} 首</small></h3></div><button className="focus-music-add" onClick={() => {setCustomTargetPlaylistId(activePlaylistId); setShowCustomInput(true);}}><Plus size={15} />新增歌曲</button></div>
        <button className="focus-music-playlist-trigger" onClick={() => setShowPlaylistSelector(true)}><ListMusic size={18} /><span><small>目前歌單</small><strong>{currentPlaylist.name}</strong></span><ChevronDown size={15} /></button>
        <div className="focus-music-tracks">
          {currentPlaylist.tracks.length === 0 && <div className="focus-music-empty"><Music2 size={30} /><strong>為專注收藏一點聲音</strong><p>新增 YouTube 歌曲，建立你的第一份播放清單。</p></div>}
          {currentPlaylist.tracks.map((item, index) => <div key={item.id} className="focus-music-row" data-active={index === currentTrackIndex}>
            <button className="focus-music-track-button" aria-label={`播放 ${item.name}`} aria-pressed={index === currentTrackIndex} onClick={() => {props.setCurrentTrackIndex(index); if (!isPlayingMusic) toggleMusic();}}>
              <span className="focus-music-number">{index === currentTrackIndex && isPlayingMusic ? <Volume2 size={13} /> : String(index + 1).padStart(2, '0')}</span><span className="focus-music-thumb">{cover(item.youtubeId, 'default')}</span><span className="focus-music-row-copy"><strong>{item.name}</strong><small>{index === currentTrackIndex ? (isPlayingMusic ? '正在播放' : '目前選擇') : 'YouTube 音樂'}</small></span>{index === currentTrackIndex && <Check size={14} />}
            </button><button className="focus-music-delete" onClick={e => props.handleRemoveTrack(e, index)} aria-label={`刪除 ${item.name}`}><Trash2 size={14} /></button>
          </div>)}
        </div><p className="focus-music-library-note">適合你的聲音，就是最好的專注背景。</p>
      </section>
    </div>
    {showPlaylistSelector && createPortal(<ModalLayer className="focus-music-overlay fixed inset-0 z-[81000]" onClick={() => setShowPlaylistSelector(false)}><section className="focus-music-subdialog" role="dialog" aria-modal="true" aria-label="切換歌單" onClick={e => e.stopPropagation()}>
      <header><div><span className="focus-music-eyebrow">YOUR PLAYLISTS</span><h3>切換歌單</h3></div><button className="focus-music-icon" aria-label="關閉歌單選擇" onClick={() => setShowPlaylistSelector(false)}><X size={18} /></button></header>
      <div className="focus-music-playlists">{playlists.map(p => <div className="focus-music-row" data-active={activePlaylistId === p.id} key={p.id}><button className="focus-music-track-button" aria-pressed={activePlaylistId === p.id} onClick={() => {onChangePlaylist(p.id); setShowPlaylistSelector(false);}}><ListMusic size={20} /><span className="focus-music-row-copy"><strong>{p.name}</strong><small>{p.tracks.length} 首音樂</small></span>{activePlaylistId === p.id && <Check size={16} />}</button>{p.id !== 'default' && activePlaylistId !== p.id && <button className="focus-music-delete" aria-label={`刪除歌單 ${p.name}`} onClick={() => {if(confirm('確定要刪除此歌單嗎？')) onDeletePlaylist(p.id);}}><Trash2 size={15} /></button>}</div>)}</div>
      <footer>{isCreatingPlaylist ? <form className="focus-music-form" onSubmit={e => {e.preventDefault(); if(newPlaylistName.trim()){onAddPlaylist(newPlaylistName.trim());setNewPlaylistName('');setIsCreatingPlaylist(false);}}}><label>歌單名稱<input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} maxLength={40} placeholder="例如：夜晚讀書時光" autoFocus /></label><div className="focus-music-form-actions"><button type="button" onClick={() => setIsCreatingPlaylist(false)}>取消</button><button className="focus-music-primary" disabled={!newPlaylistName.trim()}>建立歌單</button></div></form> : <button className="focus-music-create" onClick={() => setIsCreatingPlaylist(true)}><Plus size={16} />建立新歌單</button>}</footer>
    </section></ModalLayer>, document.body)}
    {showCustomInput && createPortal(<ModalLayer className="focus-music-overlay fixed inset-0 z-[82000]" onClick={() => !isAddingMusic && setShowCustomInput(false)}><section className="focus-music-subdialog" role="dialog" aria-modal="true" aria-label="新增 YouTube 歌曲" onClick={e => e.stopPropagation()}>
      <header><div><span className="focus-music-eyebrow">ADD TO YOUR COLLECTION</span><h3>新增 YouTube 歌曲</h3></div><button className="focus-music-icon" aria-label="關閉新增歌曲視窗" disabled={isAddingMusic} onClick={() => setShowCustomInput(false)}><X size={18} /></button></header>
      <form className="focus-music-form focus-music-add-form" onSubmit={handleAddCustomMusic}><p>把喜歡的聲音，收進你的專注歌單。</p><label>YouTube 連結<input value={customVideoUrl} onChange={e => setCustomVideoUrl(e.target.value)} placeholder="貼上 YouTube 影片連結" autoFocus /></label><label>音樂名稱 <small>選填，會自動取得標題</small><input value={customTrackName} onChange={e => setCustomTrackName(e.target.value)} placeholder="替這首音樂取個名字" /></label><label>加入歌單<select value={customTargetPlaylistId} onChange={e => setCustomTargetPlaylistId(e.target.value)}>{playlists.map(p => <option key={p.id} value={p.id}>{p.name}（{p.tracks.length} 首）</option>)}</select></label><div className="focus-music-form-actions"><button type="button" disabled={isAddingMusic} onClick={() => setShowCustomInput(false)}>取消</button><button className="focus-music-primary" disabled={isAddingMusic || !customVideoUrl.trim()}>{isAddingMusic ? '取得歌曲中…' : '加入歌單'}</button></div></form>
    </section></ModalLayer>, document.body)}
  </section>;
};
export default MusicPlayerPanel;
