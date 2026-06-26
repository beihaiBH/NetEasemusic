// 全局变量
let songList = [];
let currentIndex = 0;
let lyrics = [];
let currentLyricIndex = -1;
let playMode = 0; // 0: 顺序播放, 1: 单曲循环, 2: 随机播放
let playHistory = [];
let isShowingLyrics = false;
let isAnimating = false;
let isDataLoaded = false;
let isUserScrollingLyrics = false;
let scrollTimeout = null;
// 新增：标记是否首次手动播放（核心解决自动播放问题）
let isFirstPlay = true;

// 滑动手势相关
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50;

// 播放模式图标路径
const modeIcons = ["assets/icons/顺序.svg", "assets/icons/单曲.svg", "assets/icons/随机.svg"];

// DOM元素
const audio = document.getElementById('audio');
const titleEl = document.getElementById('title');
const artistEl = document.getElementById('artist');
const fill = document.getElementById('fill');
const dot = document.getElementById('dot');
const climaxDot = document.getElementById('climaxDot');
const bar = document.getElementById('bar');
const vinylContainer = document.getElementById('vinylContainer');
const vinylCurrent = document.getElementById('vinylCurrent');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const modeBtn = document.getElementById('modeBtn');
const lyricsContainer = document.getElementById('lyricsContainer');
const lyricsWrapper = document.getElementById('lyricsWrapper');
const lyricsContent = document.getElementById('lyricsContent');
const shareBtn = document.getElementById('shareBtn');
const listBtn = document.getElementById('listBtn');
const listPage = document.getElementById('listPage');
const listMask = document.getElementById('listMask');
const listContent = document.getElementById('listContent');
const tabs = document.querySelectorAll('.list-tab');
const closeList = document.getElementById('closeList');
const curTime = document.getElementById('cur');
const durTime = document.getElementById('dur');
const qualityLabel = document.getElementById('qualityLabel');
const toast = document.getElementById('toast');
const loader = document.getElementById('loader');

// 黑胶唱片元素
const vinylNext = document.getElementById('vinylNext');
const vinylPrev = document.getElementById('vinylPrev');
const coverCurrent = document.getElementById('coverCurrent');
const coverNext = document.getElementById('coverNext');
const coverPrev = document.getElementById('coverPrev');

// 滑动提示元素
const swipeHint = document.getElementById('swipeHint');
const swipeLeft = document.getElementById('swipeLeft');
const swipeRight = document.getElementById('swipeRight');

// 工具函数：格式化时间
function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// 工具函数：时间字符串转秒数
function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

// 显示Toast提示
function showToast(message, duration = 2000) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// 解析LRC歌词文件 - 修复版
function parseLRC(lrcText) {
  const lines = lrcText.split('\n');
  const result = [];
  
  // 改进的时间标签正则表达式，支持更多格式
  const timeRegex = /\[(\d+):(\d+)(?:[\.:](\d+))?\]/g;
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    const timeMatches = [];
    let match;
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = match[3] ? 
        (match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3])) / 1000 : 0;
      const time = minutes * 60 + seconds + milliseconds;
      timeMatches.push(time);
    }
    
    const text = line.replace(timeRegex, '').trim();
    if (timeMatches.length === 0 || !text) return;
    
    timeMatches.forEach(time => {
      result.push({ time, text });
    });
  });
  
  result.sort((a, b) => a.time - b.time);
  return result;
}

// 获取歌词内容 - 使用缓存
const lyricCache = new Map();

async function getLyrics(lrcPath) {
  if (lyricCache.has(lrcPath)) {
    return lyricCache.get(lrcPath);
  }
  
  try {
    const response = await fetch(lrcPath);
    const text = await response.text();
    lyricCache.set(lrcPath, text);
    return text;
  } catch (error) {
    console.error('加载歌词失败:', error);
    return '';
  }
}

// 加载歌曲 - 核心修改：根据isFirstPlay判断是否自动播放
async function loadSong(index, direction = 0, autoPlay = false) {
  if (!isDataLoaded || index < 0 || index >= songList.length) return;
  
  const song = songList[index];
  
  // 如果是切换歌曲且有方向，执行滑动动画
  if (direction !== 0 && !isAnimating) {
    isAnimating = true;
    await performSlideAnimation(direction, song);
    isAnimating = false;
  }
  
  currentIndex = index;
  
  // 更新UI
  titleEl.textContent = song.title;
  artistEl.textContent = song.artist;
  
  // 设置音频源
  audio.src = song.audio;
  // 修复点2：手动调用load()，强制浏览器加载音频资源，src变更后必须执行
  audio.load();
  
  durTime.textContent = song.duration || '00:00';
  qualityLabel.textContent = song.quality || '极高音质';
  
  // 更新黑胶唱片封面
  if (direction === 0) {
    coverCurrent.src = song.cover;
    coverNext.src = songList[(index + 1) % songList.length]?.cover || song.cover;
    coverPrev.src = songList[(index - 1 + songList.length) % songList.length]?.cover || song.cover;
  }
  
  // 添加到播放历史
  addToHistory(song);
  
  // 异步加载歌词
  setTimeout(async () => {
    try {
      const lrcText = await getLyrics(song.lrc);
      lyrics = parseLRC(lrcText);
      renderLyrics();
      currentLyricIndex = -1; // 重置歌词索引，修复从头高亮bug
    } catch (error) {
      console.error('加载歌词失败:', error);
      lyrics = [];
      lyricsContent.innerHTML = '<div class="lyric-line">暂无歌词</div>';
    }
  }, 0);
  
  // 设置高潮点
  setClimaxDot(song.climax);
  
  // 更新播放按钮图标
  playIcon.src = "assets/icons/播放.svg";
  
  // 核心修改：首次播放后切歌才自动播放，autoPlay仅在isFirstPlay为false时生效
  const canAutoPlay = !isFirstPlay && autoPlay;
  if (canAutoPlay) {
    // 等待音频加载后播放
    const playWhenReady = () => {
      audio.play().then(() => {
        playIcon.src = "assets/icons/暂停.svg";
        vinylCurrent.classList.add('spin');
      }).catch(err => {
        showToast('音频加载完成后请手动播放');
        console.log('自动播放失败:', err);
      });
      audio.removeEventListener('canplay', playWhenReady);
    };
    
    if (audio.readyState >= 3) {
      playWhenReady();
    } else {
      audio.addEventListener('canplay', playWhenReady);
    }
  }
}

// 执行滑动动画
function performSlideAnimation(direction, nextSong) {
  return new Promise((resolve) => {
    const targetVinyl = direction === 1 ? vinylNext : vinylPrev;
    const targetCover = direction === 1 ? coverNext : coverPrev;
    const oppositeVinyl = direction === 1 ? vinylPrev : vinylNext;
    
    // 设置目标封面
    targetCover.src = nextSong.cover;
    
    // 隐藏对面的唱片
    oppositeVinyl.style.opacity = '0';
    
    // 立即应用动画
    if (direction === 1) {
      // 下一首：从右侧滑入
      vinylCurrent.style.transform = 'translateX(-120%)';
      targetVinyl.style.transform = 'translateX(0)';
    } else {
      // 上一首：从左侧滑入
      vinylCurrent.style.transform = 'translateX(120%)';
      targetVinyl.style.transform = 'translateX(0)';
    }
    
    // 动画结束后
    setTimeout(() => {
      // 更新当前唱片
      coverCurrent.src = nextSong.cover;
      
      // 重置位置
      vinylCurrent.style.transform = 'translateX(0)';
      targetVinyl.style.transform = direction === 1 ? 'translateX(120%)' : 'translateX(-120%)';
      
      // 恢复对面唱片的显示
      oppositeVinyl.style.opacity = '1';
      
      // 更新预备唱片
      const nextIndex = (currentIndex + 1) % songList.length;
      const prevIndex = (currentIndex - 1 + songList.length) % songList.length;
      if (songList[nextIndex]) {
        coverNext.src = songList[nextIndex].cover;
      }
      if (songList[prevIndex]) {
        coverPrev.src = songList[prevIndex].cover;
      }
      
      resolve();
    }, 400);
  });
}

// 设置高潮点
function setClimaxDot(timeStr) {
  if (!timeStr) {
    climaxDot.style.display = 'none';
    return;
  }
  
  const onLoadedMetadata = () => {
    const climaxSeconds = timeToSeconds(timeStr);
    if (audio.duration && climaxSeconds < audio.duration) {
      const percent = (climaxSeconds / audio.duration) * 100;
      climaxDot.style.left = `${percent}%`;
      climaxDot.style.display = 'block';
    }
  };
  
  if (audio.duration) {
    onLoadedMetadata();
  } else {
    audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
  }
}

// 渲染歌词
function renderLyrics() {
  lyricsContent.innerHTML = '';
  
  if (!lyrics || lyrics.length === 0) {
    lyricsContent.innerHTML = '<div class="lyric-line">暂无歌词</div>';
    return;
  }
  
  lyrics.forEach((line, index) => {
    const div = document.createElement('div');
    div.className = 'lyric-line';
    div.id = `lyric-${index}`;
    div.dataset.time = line.time;
    div.textContent = line.text || '';
    lyricsContent.appendChild(div);
  });
  
  // 初始滚动到顶部，修复歌词从头开始高亮的bug
  lyricsWrapper.scrollTop = 0;
}

// 更新歌词高亮和滚动 - 核心修复：从头开始高亮，仅用户滑动后才跟随
function updateLyrics() {
  if (!lyrics || lyrics.length === 0 || !isShowingLyrics) return;
  
  const currentTime = audio.currentTime;
  let newIndex = -1;
  
  // 找到当前应该高亮的歌词，从头开始匹配
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      newIndex = i;
    } else {
      break;
    }
  }
  
  // 如果歌词索引有变化，更新高亮（仅非用户滑动时滚动）
  if (newIndex !== currentLyricIndex) {
    // 移除旧的高亮
    if (currentLyricIndex >= 0) {
      const oldLine = document.getElementById(`lyric-${currentLyricIndex}`);
      if (oldLine) oldLine.classList.remove('active');
    }
    
    // 添加新的高亮
    currentLyricIndex = newIndex;
    if (currentLyricIndex >= 0) {
      const currentLine = document.getElementById(`lyric-${currentLyricIndex}`);
      if (currentLine) {
        currentLine.classList.add('active');
        // 仅非用户滑动时，自动滚动歌词到高亮位置
        if (!isUserScrollingLyrics) {
          const lineTop = currentLine.offsetTop;
          const lineHeight = currentLine.offsetLineHeight;
          const wrapperHeight = lyricsWrapper.clientHeight;
          const targetScroll = lineTop - wrapperHeight / 2 + lineHeight / 2;
          lyricsWrapper.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    }
  }
}

// 更新进度条
function updateProgress() {
  if (!audio.duration || isNaN(audio.duration)) return;
  
  const percent = (audio.currentTime / audio.duration) * 100;
  fill.style.width = `${percent}%`;
  dot.style.left = `${percent}%`;
  curTime.textContent = formatTime(audio.currentTime);
  
  // 更新歌词
  updateLyrics();
}

// 添加播放历史
function addToHistory(song) {
  // 移除重复的
  playHistory = playHistory.filter(item => item.id !== song.id);
  // 添加到开头
  playHistory.unshift({
    ...song, 
    playTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  });
  // 限制历史记录数量
  if (playHistory.length > 50) {
    playHistory.pop();
  }
  // 保存到本地存储
  localStorage.setItem('musicHistory', JSON.stringify(playHistory));
}

// 渲染播放列表
function renderList(type) {
  listContent.innerHTML = '';
  
  const list = type === 'playlist' ? songList : playHistory;
  const isHistory = type === 'history';
  
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'list-item';
    empty.style.justifyContent = 'center';
    empty.style.color = '#999';
    empty.textContent = isHistory ? '暂无播放历史' : '播放列表为空';
    listContent.appendChild(empty);
    return;
  }
  
  list.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = `list-item ${isHistory ? 'history-item' : ''} ${item.id === songList[currentIndex]?.id ? 'active' : ''}`;
    
    div.innerHTML = `
      <div class="song-info">
        <div class="song-title">
          ${item.id === songList[currentIndex]?.id ? '<span class="playing-icon">▶</span>' : ''}
          ${item.title}
        </div>
        <div class="song-artist">${item.artist}</div>
      </div>
      ${isHistory ? `<div class="duration">${item.playTime || ''}</div>` : `<div class="duration">${item.duration || '--:--'}</div>`}
    `;
    
    div.onclick = () => {
      if (type === 'playlist') {
        const songIndex = songList.findIndex(s => s.id === item.id);
        if (songIndex !== -1) {
          currentIndex = songIndex;
          // 切歌时自动播放（首次播放后）
          loadSong(currentIndex, 0, !isFirstPlay);
          closePlaylist();
        }
      } else {
        const songIndex = songList.findIndex(s => s.id === item.id);
        if (songIndex !== -1) {
          currentIndex = songIndex;
          loadSong(currentIndex, 0, !isFirstPlay);
          closePlaylist();
        }
      }
    };
    
    listContent.appendChild(div);
  });
}

// 切换播放模式
function togglePlayMode() {
  playMode = (playMode + 1) % 3;
  modeBtn.querySelector('img').src = modeIcons[playMode];
  
  const modeNames = ["顺序播放", "单曲循环", "随机播放"];
  modeBtn.title = modeNames[playMode];
  
  showToast(`已切换为${modeNames[playMode]}`);
}

// 上一首 - 核心修改：切歌自动播放（首次播放后）
function prevSong() {
  if (isAnimating || !isDataLoaded) return;
  
  if (playMode === 2) {
    // 随机播放
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * songList.length);
    } while (songList.length > 1 && newIndex === currentIndex);
    loadSong(newIndex, -1, true);
  } else {
    // 顺序播放
    const newIndex = (currentIndex - 1 + songList.length) % songList.length;
    loadSong(newIndex, -1, true);
  }
  
  showSwipeHint('left');
}

// 下一首 - 核心修改：切歌自动播放（首次播放后）
function nextSong() {
  if (isAnimating || !isDataLoaded) return;
  
  if (playMode === 2) {
    // 随机播放
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * songList.length);
    } while (songList.length > 1 && newIndex === currentIndex);
    loadSong(newIndex, 1, true);
  } else if (playMode === 1) {
    // 单曲循环
    audio.currentTime = 0;
    audio.play().then(()=>{
      playIcon.src = "assets/icons/暂停.svg";
      vinylCurrent.classList.add('spin');
    }).catch(err => {
      showToast('请手动点击播放');
      console.log('单曲循环播放失败:', err);
    });
    return;
  } else {
    // 顺序播放
    const newIndex = (currentIndex + 1) % songList.length;
    loadSong(newIndex, 1, true);
  }
  
  showSwipeHint('right');
}

// 显示滑动提示
function showSwipeHint(direction) {
  if (direction === 'left') {
    swipeLeft.classList.add('show');
    setTimeout(() => swipeLeft.classList.remove('show'), 1000);
  } else if (direction === 'right') {
    swipeRight.classList.add('show');
    setTimeout(() => swipeRight.classList.remove('show'), 1000);
  }
}

// 原生分享功能
async function shareSong() {
  if (!isDataLoaded) return;
  
  const song = songList[currentIndex];
  const shareUrl = `${window.location.origin}${window.location.pathname}?song=${song.id}`;
  const shareText = `推荐歌曲：[北海精选音乐小屋]${song.title} - ${song.artist}\n播放链接：${shareUrl}`;
  
  // 使用原生Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: `分享歌曲: ${song.title}`,
        text: shareText,
        url: shareUrl
      });
      return;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.log('分享失败:', error);
      } else {
        return;
      }
    }
  }
  
  // 降级方案：复制到剪贴板
  copyToClipboard(shareText);
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('分享链接已复制到剪贴板');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('分享链接已复制到剪贴板');
  });
}

// 显示播放列表
function showPlaylist() {
  if (!isDataLoaded) return;
  
  listPage.classList.add('show');
  listMask.classList.add('show');
  renderList('playlist');
}

// 关闭播放列表
function closePlaylist() {
  listPage.classList.remove('show');
  listMask.classList.remove('show');
}

// 初始化滑动手势提示
function initSwipeHint() {
  setTimeout(() => {
    swipeHint.classList.add('show');
    setTimeout(() => swipeHint.classList.remove('show'), 3000);
  }, 1000);
}

// 滑动手势处理
function initSwipeGestures() {
  vinylContainer.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  vinylContainer.addEventListener('touchmove', function(e) {
    e.preventDefault();
  });

  vinylContainer.addEventListener('touchend', function(e) {
    if (!isDataLoaded) return;
    
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        prevSong();
      } else {
        nextSong();
      }
    }
  });

  // 鼠标滑动支持
  vinylContainer.addEventListener('mousedown', function(e) {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    e.preventDefault();
  });

  vinylContainer.addEventListener('mouseup', function(e) {
    if (!isDataLoaded) return;
    
    touchEndX = e.clientX;
    touchEndY = e.clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        prevSong();
      } else {
        nextSong();
      }
    }
  });
}

// 歌词滚动处理 - 核心修改：标记用户是否滑动歌词，仅滑动后允许点击跳转
function initLyricsScroll() {
  // 检测用户手动滚动
  lyricsWrapper.addEventListener('scroll', () => {
    if (!isShowingLyrics) return;
    
    isUserScrollingLyrics = true;
    
    // 清除之前的定时器（用户持续滑动则不重置）
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    // 滑动停止后，保持可点击状态（不重置为自动滚动）
    scrollTimeout = setTimeout(() => {
      // 仅标记滚动结束，不重置isUserScrollingLyrics，直到关闭歌词
    }, 500);
  });
}

// 歌词点击处理 - 核心修改：仅用户滑动歌词后，点击歌词才跳转，否则点击歌词区返回黑胶
function initLyricsClick() {
  lyricsContent.addEventListener('click', (e) => {
    if (!e.target.classList.contains('lyric-line')) return;
    // 未滑动歌词 → 关闭歌词返回黑胶
    if (!isUserScrollingLyrics) {
      isShowingLyrics = false;
      lyricsContainer.classList.remove('show');
      return;
    }
    // 已滑动歌词 → 点击歌词跳转对应时间
    const time = parseFloat(e.target.dataset.time);
    if (!isNaN(time) && audio.duration) {
      audio.currentTime = time;
      // 如果音频暂停，开始播放
      if (audio.paused) {
        audio.play().then(()=>{
          playIcon.src = "assets/icons/暂停.svg";
          vinylCurrent.classList.add('spin');
        }).catch(err => {
          showToast('请手动点击播放');
        });
      }
    }
  });
}

// 加载歌曲数据
async function loadSongData() {
  try {
    // 使用缓存策略
    const cacheKey = 'songDataCache';
    const cacheTimeKey = 'songDataCacheTime';
    const cacheDuration = 5 * 60 * 1000; // 5分钟缓存
    
    // 检查缓存
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    
    if (cachedData && cachedTime) {
      const now = Date.now();
      if (now - parseInt(cachedTime) < cacheDuration) {
        return JSON.parse(cachedData);
      }
    }
    
    // 从服务器加载
    const response = await fetch('data/songs.json');
    if (!response.ok) throw new Error('网络响应错误');
    
    const data = await response.json();
    
    // 保存到缓存
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
    
    return data;
  } catch (error) {
    console.error('加载歌曲数据失败:', error);
    
    // 尝试从缓存加载（即使过期）
    const cachedData = localStorage.getItem('songDataCache');
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // 返回空数组
    return [];
  }
}

// 初始化
async function init() {
  // 加载播放历史
  const savedHistory = localStorage.getItem('musicHistory');
  if (savedHistory) {
    try {
      playHistory = JSON.parse(savedHistory);
    } catch (e) {
      playHistory = [];
    }
  }
  
  // 异步加载歌曲数据
  try {
    songList = await loadSongData();
    isDataLoaded = true;
    
    if (songList.length === 0) {
      titleEl.textContent = '暂无歌曲';
      loader.classList.add('hidden');
      return;
    }
    
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const songId = urlParams.get('song');
    if (songId) {
      const songIndex = songList.findIndex(s => s.id === parseInt(songId));
      if (songIndex !== -1) {
        currentIndex = songIndex;
      }
    }
    
    // 初始化预备唱片
    const nextIndex = (currentIndex + 1) % songList.length;
    const prevIndex = (currentIndex - 1 + songList.length) % songList.length;
    
    // 预加载图片
    const preloadImage = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = resolve;
        img.onerror = resolve;
      });
    };
    
    // 并行预加载图片
    const preloadPromises = [
      preloadImage(songList[currentIndex].cover),
      preloadImage(songList[nextIndex].cover),
      preloadImage(songList[prevIndex].cover)
    ];
    
    await Promise.all(preloadPromises);
    
    coverCurrent.src = songList[currentIndex].cover;
    coverNext.src = songList[nextIndex].cover;
    coverPrev.src = songList[prevIndex].cover;
    
    // 加载第一首歌（不自动播放）
    await loadSong(currentIndex, 0, false);
    
    // 隐藏加载动画
    loader.classList.add('hidden');
    
  } catch (error) {
    console.error('初始化失败:', error);
    titleEl.textContent = '加载失败';
    loader.classList.add('hidden');
  }
  
  // 设置播放模式图标
  modeBtn.querySelector('img').src = modeIcons[playMode];
  
  // 初始化滑动手势
  initSwipeGestures();
  
  // 初始化歌词滚动
  initLyricsScroll();
  
  // 初始化歌词点击
  initLyricsClick();
  
  // 初始化滑动手势提示
  initSwipeHint();

  // 修复点3：添加音频错误监听，捕获加载/播放失败，给出Toast提示
  audio.addEventListener('error', (e) => {
    let errMsg = '音频加载失败，请检查文件路径';
    switch(e.target.error.code) {
      case 1: errMsg = '音频加载被中止'; break;
      case 2: errMsg = '网络错误导致音频加载失败'; break;
      case 3: errMsg = '音频解码失败'; break;
      case 4: errMsg = '音频文件不存在'; break;
    }
    showToast(errMsg);
    console.error('音频错误:', e.target.error);
  });

  // 修复点4：添加音频加载中断监听
  audio.addEventListener('abort', () => {
    showToast('音频加载被中断，请重新尝试');
  });
}

// 事件监听 - 核心修改：播放按钮点击标记首次播放完成
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', function() {
  durTime.textContent = formatTime(audio.duration);
});

audio.addEventListener('play', function() {
  playIcon.src = "assets/icons/暂停.svg";
  vinylCurrent.classList.add('spin');
  // 首次播放后，标记为已手动播放，后续切歌自动播放
  isFirstPlay = false;
});

audio.addEventListener('pause', function() {
  playIcon.src = "assets/icons/播放.svg";
  vinylCurrent.classList.remove('spin'); // 修复：暂停时移除旋转，视觉同步
});

audio.addEventListener('ended', function() {
  if (playMode === 1) {
    // 单曲循环
    audio.currentTime = 0;
    audio.play().then(()=>{
      playIcon.src = "assets/icons/暂停.svg";
      vinylCurrent.classList.add('spin');
    }).catch(err => {
      showToast('单曲循环请手动播放');
    });
  } else {
    // 播放下一首（自动播放）
    nextSong();
  }
});

// 点击黑胶唱片切换歌词显示 - 新增：打开歌词时重置滑动标记
vinylContainer.addEventListener('click', function(e) {
  // 防止滑动时触发点击
  if (Math.abs(touchEndX - touchStartX) > 10 || Math.abs(touchEndY - touchStartY) > 10) {
    return;
  }
  // 打开歌词时，重置用户滑动标记，默认不可点击歌词
  isUserScrollingLyrics = false;
  isShowingLyrics = true;
  lyricsContainer.classList.add('show');
  updateLyrics();
});

// 点击歌词容器任意区域返回黑胶（除歌词行外）
lyricsContainer.addEventListener('click', function(e) {
  if (e.target === lyricsContainer || e.target === lyricsWrapper) {
    isShowingLyrics = false;
    lyricsContainer.classList.remove('show');
    // 关闭歌词后重置滑动标记
    isUserScrollingLyrics = false;
  }
});

// 进度条点击跳转
bar.addEventListener('click', function(e) {
  const rect = bar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
  // 进度条点击后如果暂停则播放
  if (audio.paused) {
    audio.play().then(()=>{
      playIcon.src = "assets/icons/暂停.svg";
      vinylCurrent.classList.add('spin');
    }).catch(err => {
      showToast('请手动点击播放');
    });
  }
});

// 播放/暂停按钮 - 优化：增加就绪判断，失败给出提示
playBtn.addEventListener('click', function() {
  if (audio.paused) {
    // 先判断音频是否就绪，未就绪则等待canplay
    if (audio.readyState < 2) {
      showToast('音频正在加载，请稍候');
      const playWhenReady = () => {
        audio.play().catch(err => {
          showToast('请再次点击播放');
        });
        audio.removeEventListener('canplay', playWhenReady);
      };
      audio.addEventListener('canplay', playWhenReady);
      return;
    }
    audio.play().catch(err => {
      showToast('播放失败，请检查音频文件');
      console.log('播放失败:', err);
    });
  } else {
    audio.pause();
  }
});

// 上一首/下一首按钮
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);

// 播放模式按钮
modeBtn.addEventListener('click', togglePlayMode);

// 分享按钮
shareBtn.addEventListener('click', shareSong);

// 播放列表按钮
listBtn.addEventListener('click', showPlaylist);

// 关闭播放列表
closeList.addEventListener('click', closePlaylist);
listMask.addEventListener('click', closePlaylist);

// 切换播放列表和历史记录
tabs.forEach(tab => {
  tab.addEventListener('click', function() {
    tabs.forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    renderList(this.dataset.tab);
  });
});

// 初始化
init();
