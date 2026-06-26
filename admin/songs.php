<?php
// 歌曲管理系统 - 单文件解决方案
// 文件名: song_manager.php

// 定义JSON文件路径
define('SONGS_JSON', './data/songs.json');

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    $songs = json_decode(file_get_contents(SONGS_JSON), true) ?: [];
    
    if ($action === 'add' || $action === 'edit') {
        // 添加或编辑歌曲
        $id = $action === 'add' ? (count($songs) > 0 ? max(array_column($songs, 'id')) + 1 : 1) : intval($_POST['id']);
        
        $songData = [
            'id' => $id,
            'title' => trim($_POST['title']),
            'artist' => trim($_POST['artist']),
            'cover' => trim($_POST['cover']),
            'audio' => trim($_POST['audio']),
            'lrc' => trim($_POST['lrc']),
            'climax' => trim($_POST['climax']),
            'duration' => trim($_POST['duration']),
            'quality' => '极高音质' // 固定值
        ];
        
        if ($action === 'add') {
            $songs[] = $songData;
        } else {
            // 编辑模式 - 找到并更新歌曲
            foreach ($songs as &$song) {
                if ($song['id'] == $id) {
                    $song = $songData;
                    break;
                }
            }
        }
        
        // 保存到文件
        file_put_contents(SONGS_JSON, json_encode($songs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        
        // 重定向防止重复提交
        header('Location: ' . $_SERVER['PHP_SELF'] . '?success=1&action=' . $action);
        exit;
        
    } elseif ($action === 'delete') {
        // 删除歌曲
        $id = intval($_POST['id']);
        $newSongs = [];
        
        foreach ($songs as $song) {
            if ($song['id'] != $id) {
                $newSongs[] = $song;
            }
        }
        
        // 保存到文件
        file_put_contents(SONGS_JSON, json_encode($newSongs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        
        // 重定向
        header('Location: ' . $_SERVER['PHP_SELF'] . '?success=1&action=delete');
        exit;
    }
}

// 读取歌曲数据
$songs = [];
if (file_exists(SONGS_JSON)) {
    $songsData = file_get_contents(SONGS_JSON);
    $songs = json_decode($songsData, true) ?: [];
}

// 获取编辑的歌曲ID
$editId = isset($_GET['edit']) ? intval($_GET['edit']) : 0;
$editSong = null;
if ($editId > 0) {
    foreach ($songs as $song) {
        if ($song['id'] == $editId) {
            $editSong = $song;
            break;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>歌曲管理系统</title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Select2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <style>
        :root {
            --primary-color: #3498db;
            --secondary-color: #2ecc71;
            --accent-color: #9b59b6;
            --light-bg: #f8f9fa;
            --dark-bg: #1a1a2e;
            --card-bg: #ffffff;
            --text-color: #333;
            --text-light: #ecf0f1;
            --text-muted: #6c757d;
            --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
            --radius: 12px;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            color: var(--text-color);
            padding: 20px;
        }
        
        .main-container {
            background: rgba(255, 255, 255, 0.97);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            overflow: hidden;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
            color: var(--text-light);
            padding: 35px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            opacity: 0.1;
        }
        
        .header h1 {
            font-weight: 800;
            margin-bottom: 10px;
            font-size: 2.8rem;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
            position: relative;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.2rem;
            max-width: 700px;
            margin: 0 auto;
            position: relative;
        }
        
        .content-area {
            padding: 35px;
        }
        
        .song-card {
            background: var(--card-bg);
            border-radius: var(--radius);
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border-left: 5px solid var(--primary-color);
            border-top: 1px solid rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
        }
        
        .song-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
        }
        
        .song-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(to right, var(--primary-color), var(--secondary-color));
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .song-card:hover::after {
            opacity: 1;
        }
        
        .song-cover {
            width: 100px;
            height: 100px;
            border-radius: 10px;
            object-fit: cover;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s;
        }
        
        .song-cover:hover {
            transform: scale(1.05);
        }
        
        .song-title {
            font-weight: 700;
            font-size: 1.4rem;
            margin-bottom: 5px;
            color: var(--primary-color);
        }
        
        .song-artist {
            font-size: 1.1rem;
            color: var(--text-muted);
            margin-bottom: 15px;
        }
        
        .song-details {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 15px;
        }
        
        .detail-item {
            background: #f1f8ff;
            padding: 8px 15px;
            border-radius: 50px;
            font-size: 0.9rem;
            color: var(--primary-color);
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .quality-badge {
            background: linear-gradient(to right, var(--secondary-color), #27ae60);
            color: white;
            padding: 5px 15px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-block;
            box-shadow: 0 3px 8px rgba(46, 204, 113, 0.3);
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn-custom {
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 600;
            border: none;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .btn-edit {
            background: linear-gradient(to right, #3498db, #2980b9);
            color: white;
        }
        
        .btn-delete {
            background: linear-gradient(to right, #e74c3c, #c0392b);
            color: white;
        }
        
        .btn-add {
            background: linear-gradient(to right, var(--secondary-color), #27ae60);
            color: white;
            padding: 12px 25px;
            font-size: 1.1rem;
            margin-bottom: 30px;
        }
        
        .btn-custom:hover {
            transform: translateY(-2px);
            box-shadow: 0 7px 14px rgba(0, 0, 0, 0.1);
        }
        
        .form-container {
            background: white;
            border-radius: var(--radius);
            padding: 30px;
            box-shadow: var(--shadow);
            margin-bottom: 40px;
            border-top: 5px solid var(--primary-color);
        }
        
        .form-title {
            color: var(--primary-color);
            font-weight: 700;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f1f1f1;
            font-size: 1.8rem;
        }
        
        .form-label {
            font-weight: 600;
            color: #555;
            margin-bottom: 8px;
        }
        
        .form-control, .form-select {
            border-radius: 8px;
            padding: 12px 15px;
            border: 2px solid #e1e5eb;
            transition: all 0.3s;
        }
        
        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.25rem rgba(52, 152, 219, 0.25);
        }
        
        .alert-success {
            background: linear-gradient(to right, rgba(46, 204, 113, 0.1), rgba(39, 174, 96, 0.1));
            border: none;
            border-left: 5px solid var(--secondary-color);
            border-radius: 8px;
            color: #27ae60;
            font-weight: 600;
        }
        
        .footer {
            text-align: center;
            padding: 25px;
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.95rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: var(--radius);
            margin-top: 30px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-muted);
        }
        
        .empty-state i {
            font-size: 4rem;
            margin-bottom: 20px;
            color: #ddd;
        }
        
        .empty-state h3 {
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .select2-container--default .select2-selection--single {
            border: 2px solid #e1e5eb;
            border-radius: 8px;
            height: 46px;
            padding: 8px;
        }
        
        .select2-container--default .select2-selection--single .select2-selection__rendered {
            line-height: 30px;
        }
        
        .select2-container--default .select2-selection--single .select2-selection__arrow {
            height: 44px;
        }
        
        .time-input-group {
            display: flex;
            gap: 10px;
        }
        
        .time-input {
            flex: 1;
        }
        
        @media (max-width: 768px) {
            .content-area {
                padding: 20px;
            }
            
            .header {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 2.2rem;
            }
            
            .song-details {
                flex-direction: column;
                gap: 10px;
            }
            
            .time-input-group {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container main-container">
        <div class="header">
            <h1><i class="fas fa-music"></i> 歌曲管理系统</h1>
            <p>管理您的音乐库，添加、编辑或删除歌曲信息。所有更改将直接保存到 songs.json 文件中。</p>
        </div>
        
        <div class="content-area">
            <?php if (isset($_GET['success']) && $_GET['success'] == 1): ?>
                <?php 
                $actionMessages = [
                    'add' => '歌曲添加成功！',
                    'edit' => '歌曲更新成功！',
                    'delete' => '歌曲删除成功！'
                ];
                $action = $_GET['action'] ?? 'add';
                $message = $actionMessages[$action] ?? '操作成功！';
                ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> <?php echo $message; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>
            
            <!-- 添加/编辑歌曲表单 -->
            <div class="form-container">
                <h2 class="form-title">
                    <i class="fas <?php echo $editSong ? 'fa-edit' : 'fa-plus-circle'; ?>"></i>
                    <?php echo $editSong ? '编辑歌曲' : '添加新歌曲'; ?>
                </h2>
                
                <form method="POST" action="" id="songForm">
                    <input type="hidden" name="action" value="<?php echo $editSong ? 'edit' : 'add'; ?>">
                    <?php if ($editSong): ?>
                        <input type="hidden" name="id" value="<?php echo $editSong['id']; ?>">
                    <?php endif; ?>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">歌曲标题 *</label>
                            <input type="text" class="form-control" name="title" 
                                   value="<?php echo $editSong ? htmlspecialchars($editSong['title']) : ''; ?>" 
                                   required placeholder="例如：晴天">
                        </div>
                        
                        <div class="col-md-6 mb-3">
                            <label class="form-label">歌手 *</label>
                            <select class="form-control" name="artist" id="artistSelect" required>
                                <option value="">选择或输入歌手</option>
                                <option value="周杰伦" <?php echo ($editSong && $editSong['artist'] == '周杰伦') ? 'selected' : ''; ?>>周杰伦</option>
                                <option value="林俊杰" <?php echo ($editSong && $editSong['artist'] == '林俊杰') ? 'selected' : ''; ?>>林俊杰</option>
                                <option value="陈奕迅" <?php echo ($editSong && $editSong['artist'] == '陈奕迅') ? 'selected' : ''; ?>>陈奕迅</option>
                                <option value="邓紫棋" <?php echo ($editSong && $editSong['artist'] == '邓紫棋') ? 'selected' : ''; ?>>邓紫棋</option>
                                <option value="薛之谦" <?php echo ($editSong && $editSong['artist'] == '薛之谦') ? 'selected' : ''; ?>>薛之谦</option>
                                <option value="other">其他歌手...</option>
                            </select>
                            <div id="customArtistContainer" class="mt-2" style="display: none;">
                                <input type="text" class="form-control" id="customArtist" placeholder="请输入歌手名称">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">封面图片URL *</label>
                            <input type="url" class="form-control" name="cover" 
                                   value="<?php echo $editSong ? htmlspecialchars($editSong['cover']) : ''; ?>" 
                                   required placeholder="例如：https://example.com/cover.jpg">
                            <small class="text-muted">请输入歌曲封面的完整URL地址</small>
                        </div>
                        
                        <div class="col-md-6 mb-3">
                            <label class="form-label">音频文件URL *</label>
                            <input type="url" class="form-control" name="audio" 
                                   value="<?php echo $editSong ? htmlspecialchars($editSong['audio']) : ''; ?>" 
                                   required placeholder="例如：https://example.com/song.mp3">
                            <small class="text-muted">请输入音频文件的完整URL地址</small>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">歌词文件路径</label>
                            <input type="text" class="form-control" name="lrc" 
                                   value="<?php echo $editSong ? htmlspecialchars($editSong['lrc']) : ''; ?>" 
                                   placeholder="例如：./lrc/晴天.lrc">
                            <small class="text-muted">歌词文件相对于网站的路径</small>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <label class="form-label">高潮时间点</label>
                            <input type="text" class="form-control" name="climax" 
                                   value="<?php echo $editSong ? htmlspecialchars($editSong['climax']) : '01:25'; ?>" 
                                   placeholder="例如：01:25">
                            <small class="text-muted">格式：分:秒</small>
                        </div>
                        
                        <div class="col-md-3 mb-3">
                            <label class="form-label">歌曲时长</label>
                            <input type="text" class="form-control" name="duration" 
                                   value="<?php echo $editSong ? htmlspecialchars($editSong['duration']) : '04:29'; ?>" 
                                   placeholder="例如：04:29">
                            <small class="text-muted">格式：分:秒</small>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">音质</label>
                            <input type="text" class="form-control" value="极高音质" readonly>
                            <small class="text-muted">默认音质，不可修改</small>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <button type="submit" class="btn btn-custom btn-add">
                            <i class="fas <?php echo $editSong ? 'fa-save' : 'fa-plus'; ?>"></i>
                            <?php echo $editSong ? '更新歌曲信息' : '添加歌曲到库'; ?>
                        </button>
                        
                        <?php if ($editSong): ?>
                            <a href="<?php echo $_SERVER['PHP_SELF']; ?>" class="btn btn-secondary">
                                <i class="fas fa-times"></i> 取消编辑
                            </a>
                        <?php endif; ?>
                    </div>
                </form>
            </div>
            
            <!-- 歌曲列表 -->
            <h2 class="mb-4" style="color: var(--primary-color); font-weight: 700;">
                <i class="fas fa-list-ol"></i> 歌曲库 (<?php echo count($songs); ?> 首)
            </h2>
            
            <?php if (count($songs) == 0): ?>
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>暂无歌曲</h3>
                    <p>点击上方的"添加歌曲到库"按钮，开始添加您的第一首歌曲。</p>
                </div>
            <?php else: ?>
                <div class="row">
                    <?php foreach ($songs as $song): ?>
                        <div class="col-lg-6">
                            <div class="song-card">
                                <div class="row">
                                    <div class="col-4 col-md-3">
                                        <img src="<?php echo htmlspecialchars($song['cover']); ?>" 
                                             alt="<?php echo htmlspecialchars($song['title']); ?>" 
                                             class="song-cover" 
                                             onerror="this.src='https://via.placeholder.com/100x100/3498db/ffffff?text=No+Cover'">
                                    </div>
                                    <div class="col-8 col-md-9">
                                        <h3 class="song-title"><?php echo htmlspecialchars($song['title']); ?></h3>
                                        <p class="song-artist">
                                            <i class="fas fa-user"></i> <?php echo htmlspecialchars($song['artist']); ?>
                                        </p>
                                        
                                        <div class="song-details">
                                            <div class="detail-item">
                                                <i class="far fa-clock"></i> <?php echo htmlspecialchars($song['duration']); ?>
                                            </div>
                                            <div class="detail-item">
                                                <i class="fas fa-bolt"></i> 高潮: <?php echo htmlspecialchars($song['climax']); ?>
                                            </div>
                                            <div class="quality-badge">
                                                <i class="fas fa-volume-up"></i> <?php echo htmlspecialchars($song['quality']); ?>
                                            </div>
                                        </div>
                                        
                                        <div class="action-buttons">
                                            <a href="?edit=<?php echo $song['id']; ?>" class="btn btn-custom btn-edit">
                                                <i class="fas fa-edit"></i> 编辑
                                            </a>
                                            <form method="POST" action="" style="display: inline;">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="id" value="<?php echo $song['id']; ?>">
                                                <button type="submit" class="btn btn-custom btn-delete" 
                                                        onclick="return confirm('确定要删除这首歌吗？此操作无法撤销。')">
                                                    <i class="fas fa-trash"></i> 删除
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <div class="footer">
        <p>歌曲管理系统 <h6 style="color:#818284;text-align:center;font-size:12px;margin:70px 10px 30px 10px;line-height:20px;">Copyright © 2022 - 
              <script type="text/javascript">copyright = new Date();
                update = copyright.getFullYear();
                document.write(update);</script> 天津海云互联网络科技有限公司 .All Rights Reserved. ©所有解释归属权归LGZ科技集团(天津)有限公司所有</h6> | 所有更改将直接保存到 <code>songs.json</code> 文件中</p>
        <p class="mt-2">
            <i class="fas fa-database"></i> 当前数据文件: <code><?php echo realpath(SONGS_JSON); ?></code>
            github: https://github.com/beihaiBH/---NetEasemusic
        </p>
    </div>
    
    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Select2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    
    <script>
        // 初始化Select2
        $(document).ready(function() {
            $('#artistSelect').select2({
                tags: true,
                placeholder: "选择或输入歌手",
                allowClear: false,
                width: '100%'
            });
            
            // 监听歌手选择变化
            $('#artistSelect').on('change', function() {
                if ($(this).val() === 'other') {
                    $('#customArtistContainer').show();
                    $('#customArtist').prop('required', true);
                } else {
                    $('#customArtistContainer').hide();
                    $('#customArtist').prop('required', false);
                }
            });
            
            // 表单提交前处理自定义歌手
            $('#songForm').on('submit', function() {
                if ($('#artistSelect').val() === 'other') {
                    // 将自定义歌手的值设置到隐藏字段中
                    var customArtist = $('#customArtist').val();
                    if (customArtist.trim() !== '') {
                        // 创建一个隐藏的input来传递自定义歌手值
                        $('<input>').attr({
                            type: 'hidden',
                            name: 'artist',
                            value: customArtist
                        }).appendTo('#songForm');
                        
                        // 移除原select的值
                        $('#artistSelect').removeAttr('name');
                    }
                }
            });
            
            // 如果正在编辑且歌手不在选项中，显示自定义输入
            <?php if ($editSong && !in_array($editSong['artist'], ['周杰伦', '林俊杰', '陈奕迅', '邓紫棋', '薛之谦'])): ?>
                $('#artistSelect').val('other').trigger('change');
                $('#customArtist').val('<?php echo $editSong['artist']; ?>');
            <?php endif; ?>
            
            // 自动关闭成功提示
            setTimeout(function() {
                $('.alert').alert('close');
            }, 5000);
        });
    </script>
</body>
</html>