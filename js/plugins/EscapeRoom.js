//=============================================================================
// EscapeRoom.js  (RPG Maker MV)
// 걸어 다니며 조사하는 방탈출 엔진 v2.5 (모바일 터치 지원)
//=============================================================================
/*:
 * @plugindesc 걸어 다니며 조사하는 방탈출 엔진 - 이벤트 이름과 데이터 파일 하나로 단서, 자물쇠, 퀴즈를 만듭니다.
 * @author Claude
 *
 * @param DataFile
 * @text 데이터 파일 이름
 * @desc data 폴더 안에 있는 방탈출 데이터 파일 이름입니다.
 * @default EscapeData.json
 *
 * @param WallRegion
 * @text 벽 리전 번호
 * @type number
 * @min 1
 * @max 255
 * @desc 이 번호의 리전을 칠한 칸은 지나갈 수 없습니다.
 * @default 1
 *
 * @param ShowDebug
 * @text 제작 도우미 보기
 * @type boolean
 * @on 보기
 * @off 숨기기
 * @desc 켜면 벽(리전), 조사 이벤트 이름, 주인공 좌표가 화면에 보입니다. 제작할 때만 켜세요.
 * @default false
 *
 * @param SeDoor
 * @text 효과음: 문 열림
 * @desc audio/se 폴더의 효과음 이름. 파일이 없으면 소리만 나지 않고 게임은 그대로 진행됩니다.
 * @default Open1
 *
 * @param SeSolve
 * @text 효과음: 퍼즐 해결
 * @default Chime2
 *
 * @param SeItem
 * @text 효과음: 아이템 획득
 * @default Item3
 *
 * @param SeGate
 * @text 효과음: 시간의 문
 * @default Teleport
 *
 * @param SeWarp
 * @text 효과음: 시대 이동
 * @default Move1
 *
 * @help
 * ============================================================================
 *  사용 방법 (자세한 내용은 함께 드린 안내서를 보세요)
 * ============================================================================
 *  - 방 하나 = 맵 하나. 데이터 파일의 각 방에 "map": 맵 번호 를 적습니다.
 *  - 조사할 물건 = 이벤트. 이벤트 '이름'을 데이터 파일의 조사 지점 id와
 *    똑같이 적으면, 그 앞에서 결정키를 눌렀을 때 데이터 파일 내용이 실행됩니다.
 *    이벤트 내용(실행 내용)은 비워 둬도 됩니다.
 *    큰 물건은 같은 이름의 이벤트를 여러 칸에 놓으면 됩니다.
 *  - 문처럼 걸어 들어가면 반응해야 하는 곳은 이벤트 트리거를
 *    '플레이어로부터 접촉'으로 바꾸세요.
 *  - 지나가면 안 되는 곳은 리전 1번(설정에서 변경 가능)을 칠합니다.
 *  - ESC / X / 오른쪽 클릭: 가방,  H: 힌트
 *
 *  v2.1 추가 기능
 *  - 다이얼 자물쇠: 글자·방향·색깔 등 여러 칸을 돌려 맞추는 자물쇠 ("dial")
 *  - 주인공 고르기: 데이터 파일의 "characters" 목록에서 고르기 ("selectCharacter")
 *  - 캐릭터 그림이 있는 조사 이벤트(NPC)는 말을 걸면 주인공 쪽으로 돌아봅니다.
 *
 *  v2.2 효과
 *  - 문 열림, 퍼즐 해결, 아이템 획득, 오답, 시대 이동, 시간의 문 연출
 *  - 효과음은 audio/se에 파일이 없으면 소리만 나지 않고 게임은 멈추지 않습니다.
 *
 *  v2.3 타이틀·음악·영상 (모두 데이터 파일에서 지정)
 *  - "gameTitle", "titleImage"(img/titles1), "titleText", "titleBgm"
 *  - "bgm"(기본), 방마다 "bgm", "endingBgm", 단계 { "bgm": "곡 이름" }
 *  - 단계 { "movie": "영상 이름" } : movies 폴더의 .webm/.mp4, Enter·클릭으로 건너뛰기
 *  - 파일이 없으면 그 기능만 조용히 건너뜁니다.
 *
 *  v2.4 후기 링크
 *  - 데이터 파일의 "review": { "url": "...", "picture": "...", "text": "..." }
 *    엔딩 정리가 끝난 뒤 안내 화면이 나오고, Enter·클릭을 누르는 순간 링크가 열립니다.
 *  - 단계에 "openUrl"을 붙여도 같은 방식으로 링크를 엽니다.
 */

var Imported = Imported || {};
Imported.EscapeRoom = '2.4.0';

var $dataEscape = null;
var EscapeManager = null;

(function() {
    'use strict';

    var params = PluginManager.parameters('EscapeRoom');
    var DATA_FILE = String(params['DataFile'] || 'EscapeData.json');
    var WALL_REGION = Number(params['WallRegion'] || 1);
    var SHOW_DEBUG = String(params['ShowDebug']) === 'true';
    var SE_DOOR = params['SeDoor'] === undefined ? 'Open1' : String(params['SeDoor']);
    var SE_SOLVE = params['SeSolve'] === undefined ? 'Chime2' : String(params['SeSolve']);
    var SE_ITEM = params['SeItem'] === undefined ? 'Item3' : String(params['SeItem']);
    var SE_GATE = params['SeGate'] === undefined ? 'Teleport' : String(params['SeGate']);
    var SE_WARP = params['SeWarp'] === undefined ? 'Move1' : String(params['SeWarp']);

    var HUD_H = 40;
    var MSG_LINES = 3;

    function SW() { return Graphics.boxWidth; }
    function SH() { return Graphics.boxHeight; }

    //=========================================================================
    // 데이터 파일 불러오기
    //=========================================================================
    var _DataManager_loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        _DataManager_loadDatabase.call(this);
        loadEscapeData();
    };

    function loadEscapeData() {
        $dataEscape = null;
        var url = 'data/' + DATA_FILE;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.overrideMimeType('application/json');
        xhr.onload = function() {
            if (xhr.status >= 400) {
                $dataEscape = { __error: '데이터 파일을 찾을 수 없습니다: ' + url };
                return;
            }
            try {
                $dataEscape = JSON.parse(xhr.responseText);
            } catch (e) {
                $dataEscape = { __error: '데이터 파일에 문법 오류가 있습니다.\n' + e.message +
                    '\n쉼표(,), 따옴표("), 괄호를 확인해 주세요.' };
            }
        };
        xhr.onerror = function() {
            $dataEscape = { __error: '데이터 파일을 찾을 수 없습니다: ' + url };
        };
        xhr.send();
    }

    // 음악·영상·타이틀 그림이 실제로 있는지 미리 확인 (없으면 그 기능만 건너뜀)
    var EscapeAssets = {};
    var _assetState = 'idle';
    var _assetPending = 0;

    // 창 바깥을 톡 눌렀는지 (단서 그림 위를 누른 것은 제외)
    function escTappedOutside(win) {
        if (!TouchInput.isTriggered()) return false;
        var lx = win.canvasToLocalX(TouchInput.x), ly = win.canvasToLocalY(TouchInput.y);
        if (lx >= 0 && ly >= 0 && lx < win.width && ly < win.height) return false;
        if (TouchInput.y < HUD_H) return false;
        var sc = SceneManager._scene, cu = sc && sc._escCloseup;
        if (cu && cu.visible && cu.bitmap && cu.bitmap.width) {
            var w = cu.bitmap.width * cu.scale.x, h = cu.bitmap.height * cu.scale.y;
            if (Math.abs(TouchInput.x - cu.x) < w / 2 && Math.abs(TouchInput.y - cu.y) < h / 2) return false;
        }
        return true;
    }

    // 건너뛴 영상이 MV의 재시도 타이머로 다시 시작되지 않도록
    var _Graphics_playVideoInner = Graphics._playVideo;
    Graphics._playVideo = function(src) {
        if (this._escVideoCancelled) return;
        _Graphics_playVideoInner.call(this, src);
    };

    function videoExt() {
        return Game_Interpreter.prototype.videoFileExt.call(null);
    }

    function assetUrl(key) {
        var i = key.indexOf('/');
        var kind = key.substring(0, i);
        var name = key.substring(i + 1);
        var url;
        if (kind === 'bgm') {
            url = AudioManager._path + 'bgm/' + encodeURIComponent(name) + AudioManager.audioFileExt();
            if (Decrypter.hasEncryptedAudio) url = Decrypter.extToEncryptExt(url);
        } else if (kind === 'title') {
            url = 'img/titles1/' + encodeURIComponent(name) + '.png';
            if (Decrypter.hasEncryptedImages) url = Decrypter.extToEncryptExt(url);
        } else {
            url = 'movies/' + encodeURIComponent(name) + videoExt();
        }
        return url;
    }

    function collectAssets(d) {
        var keys = {};
        var addBgm = function(n) { if (n) keys['bgm/' + n] = true; };
        if (d.titleImage) keys['title/' + d.titleImage] = true;
        addBgm(d.titleBgm); addBgm(d.bgm); addBgm(d.endingBgm);
        var scan = function(steps) {
            toArray(steps).forEach(function(st) {
                if (!st || typeof st !== 'object') return;
                if (st.bgm) addBgm(st.bgm);
                if (st.movie) keys['movie/' + st.movie] = true;
                Object.keys(st).forEach(function(k) {
                    if (k === 'success' || k === 'fail' || k === 'cancel' || /^on\d+$/.test(k)) scan(st[k]);
                });
            });
        };
        scan(d.intro);
        toArray(d.rooms).forEach(function(r) {
            addBgm(r.bgm);
            scan(r.enter);
            toArray(r.hotspots).forEach(function(h) {
                scan(h.steps);
                toArray(h.cases).forEach(function(c) { scan(c.steps); });
            });
        });
        return Object.keys(keys);
    }

    function startAssetCheck() {
        _assetState = 'checking';
        var d = $dataEscape;
        var keys = (d && !d.__error) ? collectAssets(d) : [];
        _assetPending = keys.length;
        if (_assetPending === 0) _assetState = 'done';
        keys.forEach(function(key) {
            var done = function(ok) {
                if (EscapeAssets[key] !== undefined) return;
                EscapeAssets[key] = ok;
                if (!ok) console.warn('EscapeRoom: 파일이 없어 건너뜁니다 → ' + assetUrl(key));
                _assetPending--;
                if (_assetPending <= 0) _assetState = 'done';
            };
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', assetUrl(key));
                xhr.responseType = 'arraybuffer';
                xhr.onload = function() {
                    done(xhr.status < 400 && !!xhr.response && xhr.response.byteLength > 0);
                };
                xhr.onerror = function() { done(false); };
                xhr.send();
            } catch (e) {
                done(false);
            }
        });
    }

    var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        if (!_DataManager_isDatabaseLoaded.call(this) || !$dataEscape) return false;
        if (_assetState === 'idle') startAssetCheck();
        return _assetState === 'done';
    };

    function hasAsset(kind, name) {
        return !!name && EscapeAssets[kind + '/' + name] === true;
    }

    //=========================================================================
    // 타이틀 화면: 그림 · 게임 이름 · 음악
    //=========================================================================
    function escData() {
        return $dataEscape && !$dataEscape.__error ? $dataEscape : null;
    }

    var _Scene_Title_createBackground = Scene_Title.prototype.createBackground;
    Scene_Title.prototype.createBackground = function() {
        var d = escData();
        if (d && hasAsset('title', d.titleImage)) {
            this._backSprite1 = new Sprite(ImageManager.loadTitle1(d.titleImage));
            this._backSprite2 = new Sprite();
            this.addChild(this._backSprite1);
            this.addChild(this._backSprite2);
            this._escTitleImage = true;
        } else {
            _Scene_Title_createBackground.call(this);
        }
    };

    var _Scene_Title_drawGameTitle = Scene_Title.prototype.drawGameTitle;
    Scene_Title.prototype.drawGameTitle = function() {
        var d = escData();
        if (this._escTitleImage && d && d.titleText === false) return;
        if (d && d.gameTitle) {
            var b = this._gameTitleSprite.bitmap;
            b.outlineColor = 'rgba(40,22,10,1)';
            b.outlineWidth = 8;
            b.fontSize = 64;
            b.textColor = '#ffe8a0';
            b.drawText(d.gameTitle, 20, Graphics.height / 4, Graphics.width - 40, 64, 'center');
            return;
        }
        _Scene_Title_drawGameTitle.call(this);
    };

    var _Scene_Title_playTitleMusic = Scene_Title.prototype.playTitleMusic;
    Scene_Title.prototype.playTitleMusic = function() {
        var d = escData();
        if (d && hasAsset('bgm', d.titleBgm)) {
            AudioManager.playBgm({ name: d.titleBgm, volume: 90, pitch: 100, pan: 0 });
            AudioManager.stopBgs();
            AudioManager.stopMe();
            return;
        }
        _Scene_Title_playTitleMusic.call(this);
    };

    var _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        var d = escData();
        if (d && d.gameTitle) document.title = d.gameTitle;
    };

    //=========================================================================
    // 도움 함수
    //=========================================================================
    function toArray(v) {
        if (v === undefined || v === null) return [];
        return Array.isArray(v) ? v : [v];
    }

    // 외부 링크 열기 (설치형: 기본 브라우저 / 웹: 새 탭)
    function openExternal(url) {
        try {
            if (Utils.isNwjs()) {
                var shell = (typeof nw !== 'undefined' && nw.Shell) ? nw.Shell : require('nw.gui').Shell;
                shell.openExternal(url);
                return true;
            }
            var w = window.open(url, '_blank');
            if (w) {
                try { w.opener = null; } catch (e) {}
                return true;
            }
        } catch (e) {
            console.warn('EscapeRoom: 링크를 열지 못했습니다 → ' + url);
        }
        return false;
    }

    // 안전한 효과음: 파일이 없어도 게임이 멈추지 않고 조용히 넘어갑니다.
    var _seCache = {};
    function playSafeSe(name, volume, pitch) {
        if (!name) return false;
        var ctx = WebAudio._context;
        if (!ctx) return false;
        var play = function(buffer) {
            try {
                var src = ctx.createBufferSource();
                src.buffer = buffer;
                src.playbackRate.value = (pitch || 100) / 100;
                var g = ctx.createGain();
                g.gain.value = (AudioManager.seVolume / 100) * ((volume || 90) / 100);
                src.connect(g);
                g.connect(WebAudio._masterGainNode || ctx.destination);
                src.start(0);
            } catch (e) {}
        };
        var cached = _seCache[name];
        if (cached === false) return false;
        if (cached && cached !== 'loading') {
            play(cached);
            return true;
        }
        if (cached === 'loading') return true;
        _seCache[name] = 'loading';
        var url = AudioManager._path + 'se/' + encodeURIComponent(name) + AudioManager.audioFileExt();
        if (Decrypter.hasEncryptedAudio) url = Decrypter.extToEncryptExt(url);
        var xhr = new XMLHttpRequest();
        try {
            xhr.open('GET', url);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                if (xhr.status >= 400 || !xhr.response || !xhr.response.byteLength) {
                    _seCache[name] = false;
                    return;
                }
                try {
                    var arr = xhr.response;
                    if (Decrypter.hasEncryptedAudio) arr = Decrypter.decryptArrayBuffer(arr);
                    ctx.decodeAudioData(arr, function(buffer) {
                        _seCache[name] = buffer;
                        play(buffer);
                    }, function() { _seCache[name] = false; });
                } catch (e) {
                    _seCache[name] = false;
                }
            };
            xhr.onerror = function() { _seCache[name] = false; };
            xhr.send();
        } catch (e) {
            _seCache[name] = false;
        }
        return true;
    }

    // 효과용 그림(코드로 그림)
    var _fxCache = {};
    function fxGlow(size, rgb) {
        var key = 'glow' + size + rgb;
        if (_fxCache[key]) return _fxCache[key];
        var b = new Bitmap(size, size);
        var ctx = b._context || b.context;
        var g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(' + rgb + ',1)');
        g.addColorStop(0.35, 'rgba(' + rgb + ',0.55)');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        setDirty(b);
        _fxCache[key] = b;
        return b;
    }
    function fxSpark(rgb) {
        var key = 'spark' + rgb;
        if (_fxCache[key]) return _fxCache[key];
        var b = new Bitmap(24, 24);
        var ctx = b._context || b.context;
        var g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.3, 'rgba(' + rgb + ',0.8)');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(12, 0); ctx.lineTo(14, 10); ctx.lineTo(24, 12); ctx.lineTo(14, 14);
        ctx.lineTo(12, 24); ctx.lineTo(10, 14); ctx.lineTo(0, 12); ctx.lineTo(10, 10);
        ctx.closePath();
        ctx.fill();
        setDirty(b);
        _fxCache[key] = b;
        return b;
    }
    function fxRays(size) {
        var key = 'rays' + size;
        if (_fxCache[key]) return _fxCache[key];
        var b = new Bitmap(size, size);
        var ctx = b._context || b.context;
        var c = size / 2;
        for (var i = 0; i < 12; i++) {
            var a = i * Math.PI / 6;
            var g = ctx.createRadialGradient(c, c, 0, c, c, c);
            g.addColorStop(0, 'rgba(255,248,210,0.9)');
            g.addColorStop(1, 'rgba(255,248,210,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(c, c);
            ctx.lineTo(c + Math.cos(a - 0.09) * c, c + Math.sin(a - 0.09) * c);
            ctx.lineTo(c + Math.cos(a + 0.09) * c, c + Math.sin(a + 0.09) * c);
            ctx.closePath();
            ctx.fill();
        }
        setDirty(b);
        _fxCache[key] = b;
        return b;
    }
    function fxDoorway() {
        if (_fxCache.doorway) return _fxCache.doorway;
        var b = new Bitmap(48, 48);
        var ctx = b._context || b.context;
        var g = ctx.createRadialGradient(24, 24, 2, 24, 24, 30);
        g.addColorStop(0, 'rgba(255,250,220,0.95)');
        g.addColorStop(0.6, 'rgba(255,214,120,0.55)');
        g.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 48, 48);
        setDirty(b);
        _fxCache.doorway = b;
        return b;
    }

    function setDirty(bitmap) {
        if (bitmap._setDirty) bitmap._setDirty();
    }

    function ctxOf(bitmap) {
        return bitmap._context || bitmap.context;
    }

    function roundRect(bitmap, x, y, w, h, r, fill, stroke, lineWidth) {
        var ctx = ctxOf(bitmap);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth || 2;
            ctx.stroke();
        }
        ctx.restore();
        setDirty(bitmap);
    }

    // 한글 줄바꿈: 띄어쓰기 단위로 자르고, 너무 긴 단어는 글자 단위로 자릅니다.
    function wrapText(bitmap, text, maxWidth) {
        var result = [];
        String(text).replace(/\\n/g, '\n').split('\n').forEach(function(para) {
            var words = para.split(' ');
            var line = '';
            words.forEach(function(word) {
                var test = line ? line + ' ' + word : word;
                if (bitmap.measureTextWidth(test) <= maxWidth) {
                    line = test;
                    return;
                }
                if (line) result.push(line);
                line = '';
                var chunk = '';
                for (var i = 0; i < word.length; i++) {
                    var t = chunk + word[i];
                    if (bitmap.measureTextWidth(t) > maxWidth && chunk) {
                        result.push(chunk);
                        chunk = word[i];
                    } else {
                        chunk = t;
                    }
                }
                line = chunk;
            });
            result.push(line);
        });
        return result;
    }

    function formatTime(sec) {
        sec = Math.max(0, Math.ceil(sec));
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    var DIR_NAMES = { down: 2, left: 4, right: 6, up: 8 };
    function toDir(d) {
        if (typeof d === 'string') return DIR_NAMES[d] || 2;
        return Number(d) || 0;
    }

    //=========================================================================
    // Window_EscMessage - 대사창 (글자가 한 글자씩 나타납니다)
    //=========================================================================
    function Window_EscMessage() {
        this.initialize.apply(this, arguments);
    }
    Window_EscMessage.prototype = Object.create(Window_Base.prototype);
    Window_EscMessage.prototype.constructor = Window_EscMessage;

    Window_EscMessage.prototype.initialize = function() {
        var h = this.fittingHeight(MSG_LINES);
        Window_Base.prototype.initialize.call(this, 12, SH() - h - 10, SW() - 24, h);
        this.openness = 0;
        this._pages = [];
        this._callback = null;
        this._waitInput = false;
        this._openFrame = 0;
        this._shown = 0;
        this._total = 0;
        this._nameWindow = null;
    };

    Window_EscMessage.prototype.standardFontSize = function() { return 24; };
    Window_EscMessage.prototype.lineHeight = function() { return 36; };
    Window_EscMessage.prototype.setNameWindow = function(w) { this._nameWindow = w; };

    Window_EscMessage.prototype.say = function(text, speaker, callback, waitInput) {
        this.resetFontSettings();
        var lines = wrapText(this.contents, text, this.contentsWidth() - 12);
        this._pages = [];
        for (var i = 0; i < lines.length; i += MSG_LINES) {
            this._pages.push(lines.slice(i, i + MSG_LINES));
        }
        if (this._pages.length === 0) this._pages.push(['']);
        this._callback = callback || null;
        this._waitInput = waitInput !== false;
        this._openFrame = Graphics.frameCount;
        this.startPage(!this._waitInput);
        this.open();
        if (this._nameWindow) this._nameWindow.setName(speaker || '', this);
    };

    Window_EscMessage.prototype.startPage = function(instant) {
        var page = this._pages[0] || [];
        this._total = page.join('').length;
        this._shown = instant ? this._total : 0;
        this.drawPage();
    };

    Window_EscMessage.prototype.drawPage = function() {
        this.contents.clear();
        this.resetFontSettings();
        var page = this._pages[0] || [];
        var left = this._shown;
        for (var i = 0; i < page.length && left > 0; i++) {
            var part = page[i].substring(0, left);
            left -= page[i].length;
            this.drawText(part, 6, i * this.lineHeight(), this.contentsWidth() - 12);
        }
    };

    Window_EscMessage.prototype.isTyping = function() {
        return this._shown < this._total;
    };

    Window_EscMessage.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (!this.isOpen() || this._pages.length === 0) {
            this.pause = false;
            return;
        }
        if (this.isTyping()) {
            this._shown = Math.min(this._total, this._shown + 2);
            this.drawPage();
        }
        this.pause = this._waitInput && !this.isTyping();
        if (!this._waitInput) return;
        if (Graphics.frameCount === this._openFrame) return;
        if (Input.isTriggered('ok') || Input.isTriggered('cancel') ||
            TouchInput.isTriggered() || TouchInput.isCancelled()) {
            if (this.isTyping()) {
                this._shown = this._total;
                this.drawPage();
                return;
            }
            this._pages.shift();
            if (this._pages.length > 0) {
                this.startPage(false);
            } else {
                this.finish();
            }
        }
    };

    Window_EscMessage.prototype.finish = function() {
        this._pages = [];
        this._waitInput = false;
        this.pause = false;
        this.close();
        if (this._nameWindow) this._nameWindow.setName('', this);
        var cb = this._callback;
        this._callback = null;
        if (cb) cb();
    };

    Window_EscMessage.prototype.dismiss = function() {
        this._pages = [];
        this._waitInput = false;
        this._callback = null;
        this.pause = false;
        this.close();
        if (this._nameWindow) this._nameWindow.setName('', this);
    };

    //=========================================================================
    // Window_EscName - 말하는 사람 이름표
    //=========================================================================
    function Window_EscName() {
        this.initialize.apply(this, arguments);
    }
    Window_EscName.prototype = Object.create(Window_Base.prototype);
    Window_EscName.prototype.constructor = Window_EscName;

    Window_EscName.prototype.initialize = function() {
        Window_Base.prototype.initialize.call(this, 0, 0, 240, this.fittingHeight(1));
        this.openness = 0;
    };

    Window_EscName.prototype.standardFontSize = function() { return 22; };

    Window_EscName.prototype.setName = function(name, msgWindow) {
        if (!name) {
            this.close();
            return;
        }
        this.resetFontSettings();
        var w = Math.min(SW() - 40, Math.max(120, this.contents.measureTextWidth(name) + this.standardPadding() * 2 + 24));
        this.width = w;
        this.createContents();
        this.x = msgWindow.x + 8;
        this.y = msgWindow.y - this.height + 6;
        this.changeTextColor(this.textColor(6));
        this.drawText(name, 0, 0, this.contentsWidth(), 'center');
        this.open();
    };

    //=========================================================================
    // Window_EscChoice - 선택지(퀴즈)
    //=========================================================================
    function Window_EscChoice() {
        this.initialize.apply(this, arguments);
    }
    Window_EscChoice.prototype = Object.create(Window_Command.prototype);
    Window_EscChoice.prototype.constructor = Window_EscChoice;

    Window_EscChoice.prototype.initialize = function() {
        this._options = ['-'];
        Window_Command.prototype.initialize.call(this, 0, 0);
        this.openness = 0;
        this.deactivate();
    };

    Window_EscChoice.prototype.standardFontSize = function() { return 22; };
    Window_EscChoice.prototype.windowWidth = function() { return Math.min(720, SW() - 40); };
    Window_EscChoice.prototype.numVisibleRows = function() { return this._options.length; };

    Window_EscChoice.prototype.makeCommandList = function() {
        var marks = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
        for (var i = 0; i < this._options.length; i++) {
            this.addCommand((marks[i] || (i + 1) + '.') + ' ' + this._options[i], 'choice' + i);
        }
    };

    Window_EscChoice.prototype.setup = function(options, bottomY) {
        this._options = options.slice(0, 8);
        this.width = this.windowWidth();
        this.height = this.fittingHeight(this._options.length);
        this.x = (SW() - this.width) / 2;
        this.y = Math.max(HUD_H + 4, bottomY - this.height - 44);
        this.refresh();
        this.select(0);
        this.open();
        this.activate();
        this._openFrame = Graphics.frameCount;
    };

    Window_EscChoice.prototype.onTouch = function(triggered) {
        var x = this.canvasToLocalX(TouchInput.x);
        var y = this.canvasToLocalY(TouchInput.y);
        var hit = this.hitTest(x, y);
        if (hit >= 0) {
            if (hit !== this.index()) {
                this.select(hit);
                SoundManager.playCursor();
            }
            if (triggered) this.processOk();
        }
    };

    //=========================================================================
    // Window_EscNumpad - 숫자 자물쇠
    //=========================================================================
    function Window_EscNumpad() {
        this.initialize.apply(this, arguments);
    }
    Window_EscNumpad.prototype = Object.create(Window_Selectable.prototype);
    Window_EscNumpad.prototype.constructor = Window_EscNumpad;

    var PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0', '확인'];
    var PAD_TOP = 74;

    Window_EscNumpad.prototype.initialize = function() {
        var w = 380;
        var h = this.standardPadding() * 2 + PAD_TOP + 4 * 52;
        Window_Selectable.prototype.initialize.call(this, (SW() - w) / 2, 0, w, h);
        this._digits = 4;
        this._value = '';
        this.openness = 0;
        this.deactivate();
        this.refresh();
    };

    Window_EscNumpad.prototype.standardFontSize = function() { return 24; };
    Window_EscNumpad.prototype.maxItems = function() { return PAD_KEYS.length; };
    Window_EscNumpad.prototype.maxCols = function() { return 3; };
    Window_EscNumpad.prototype.itemHeight = function() { return 52; };

    Window_EscNumpad.prototype.itemRect = function(index) {
        var rect = Window_Selectable.prototype.itemRect.call(this, index);
        rect.y += PAD_TOP;
        return rect;
    };

    Window_EscNumpad.prototype.setup = function(digits, bottomY) {
        this._digits = Math.max(1, Math.min(8, digits || 4));
        this._value = '';
        this.y = Math.max(HUD_H + 4, bottomY - this.height - 44);
        this.refresh();
        this.select(11);
        this.open();
        this.activate();
        this._openFrame = Graphics.frameCount;
    };

    Window_EscNumpad.prototype.value = function() { return this._value; };
    Window_EscNumpad.prototype.isFull = function() { return this._value.length >= this._digits; };

    Window_EscNumpad.prototype.addDigit = function(d) {
        if (this._value.length < this._digits) {
            this._value += d;
            SoundManager.playCursor();
            this.refresh();
        } else {
            SoundManager.playBuzzer();
        }
    };

    Window_EscNumpad.prototype.backspace = function() {
        if (this._value.length > 0) {
            this._value = this._value.slice(0, -1);
            SoundManager.playCancel();
            this.refresh();
        }
    };

    Window_EscNumpad.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        this.resetFontSettings();
        var box = 40;
        var gap = 8;
        var total = this._digits * box + (this._digits - 1) * gap;
        var sx = (this.contentsWidth() - total) / 2;
        for (var i = 0; i < this._digits; i++) {
            var bx = sx + i * (box + gap);
            roundRect(this.contents, bx, 8, box, 52, 6, 'rgba(0,0,0,0.55)', 'rgba(255,224,160,0.9)', 2);
            this.contents.fontSize = 30;
            this.changeTextColor(this.textColor(0));
            this.contents.drawText(this._value[i] || '', bx, 8, box, 52, 'center');
        }
        this.resetFontSettings();
        this.drawAllItems();
    };

    Window_EscNumpad.prototype.drawItem = function(index) {
        var rect = this.itemRect(index);
        var key = PAD_KEYS[index];
        var fill = key === '확인' ? 'rgba(60,120,70,0.85)' : (key === '지우기' ? 'rgba(120,60,50,0.8)' : 'rgba(255,255,255,0.10)');
        roundRect(this.contents, rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6, 8, fill, 'rgba(255,255,255,0.25)', 1);
        this.resetFontSettings();
        if (key.length > 1) this.contents.fontSize = 20;
        this.contents.drawText(key, rect.x, rect.y, rect.width, rect.height, 'center');
    };

    Window_EscNumpad.prototype.onTouch = function(triggered) {
        var x = this.canvasToLocalX(TouchInput.x);
        var y = this.canvasToLocalY(TouchInput.y);
        var hit = this.hitTest(x, y);
        if (hit >= 0 && triggered) {
            this.select(hit);
            this.processOk();
        }
    };

    Window_EscNumpad.prototype.processOk = function() {
        var key = PAD_KEYS[this.index()];
        if (key === '지우기') {
            this.backspace();
        } else if (key === '확인') {
            this.updateInputData();
            this.callHandler('submit');
        } else if (key) {
            this.addDigit(key);
        }
    };

    //=========================================================================
    // Window_EscDial - 다이얼 자물쇠 (글자·방향·색깔 등)
    //=========================================================================
    function Window_EscDial() {
        this.initialize.apply(this, arguments);
    }
    Window_EscDial.prototype = Object.create(Window_Base.prototype);
    Window_EscDial.prototype.constructor = Window_EscDial;

    var DIAL_ARROW = 26;
    var DIAL_BOX = 54;
    var DIAL_GAP = 10;
    var DIAL_BTN = 40;

    Window_EscDial.prototype.initialize = function() {
        Window_Base.prototype.initialize.call(this, 0, 0, 300, 200);
        this.openness = 0;
        this._slots = [];
        this._values = [];
        this._labels = [];
        this._cursor = 0;
        this._handlers = {};
        this._openFrame = -1;
        this._slotW = 80;
        this._fontSize = 24;
        this.deactivate();
    };

    Window_EscDial.prototype.setHandler = function(name, fn) { this._handlers[name] = fn; };
    Window_EscDial.prototype.callHandler = function(name) {
        if (this._handlers[name]) this._handlers[name]();
    };

    Window_EscDial.prototype.titleH = function() { return this._title ? 34 : 0; };
    Window_EscDial.prototype.labelH = function() { return this.titleH() + (this._labels.length > 0 ? 28 : 0); };

    Window_EscDial.prototype.setup = function(slots, labels, bottomY, title) {
        this._title = title || '';
        this._slots = slots;
        this._labels = labels || [];
        this._values = slots.map(function() { return 0; });
        this._cursor = 0;
        var n = slots.length;
        var probe = this.contents;
        var widest = 0;
        this._fontSize = 24;
        var measure = function(fs) {
            probe.fontSize = fs;
            var w = 0;
            slots.forEach(function(list, i) {
                list.forEach(function(sym) { w = Math.max(w, probe.measureTextWidth(String(sym))); });
            });
            return w;
        };
        var labelW = 0;
        probe.fontSize = 16;
        this._labels.forEach(function(l) { labelW = Math.max(labelW, probe.measureTextWidth(String(l))); });
        var pad = this.standardPadding();
        var maxW = SW() - 24;
        for (var fs = 24; fs >= 16; fs -= 2) {
            widest = measure(fs);
            this._fontSize = fs;
            this._slotW = Math.max(64, widest + 26, Math.min(labelW + 10, 170));
            if (n * this._slotW + (n - 1) * DIAL_GAP + pad * 2 <= maxW) break;
        }
        var minW = 300;
        if (this._title) {
            probe.fontSize = 18;
            minW = Math.max(minW, Math.min(maxW, probe.measureTextWidth(this._title) + pad * 2 + 16));
        }
        this.width = Math.min(maxW, Math.max(minW, n * this._slotW + (n - 1) * DIAL_GAP + pad * 2));
        this.height = pad * 2 + this.labelH() + DIAL_ARROW * 2 + DIAL_BOX + 12 + DIAL_BTN;
        this.x = (SW() - this.width) / 2;
        this.y = Math.max(HUD_H + 4, bottomY - this.height - 44);
        this.createContents();
        this.refresh();
        this.open();
        this.activate();
        this._openFrame = Graphics.frameCount;
    };

    Window_EscDial.prototype.values = function() {
        var self = this;
        return this._slots.map(function(list, i) { return String(list[self._values[i]]); });
    };

    Window_EscDial.prototype.slotX = function(i) {
        var n = this._slots.length;
        var total = n * this._slotW + (n - 1) * DIAL_GAP;
        return (this.contentsWidth() - total) / 2 + i * (this._slotW + DIAL_GAP);
    };

    Window_EscDial.prototype.btnRect = function() {
        var w = 140;
        var y = this.labelH() + DIAL_ARROW * 2 + DIAL_BOX + 12;
        return { x: (this.contentsWidth() - w) / 2, y: y, w: w, h: DIAL_BTN - 4 };
    };

    Window_EscDial.prototype.refresh = function() {
        var b = this.contents;
        b.clear();
        var n = this._slots.length;
        var top = this.labelH();
        if (this._title) {
            b.fontSize = 18;
            b.textColor = '#ffe9b0';
            b.drawText(this._title, 0, 0, this.contentsWidth(), 28, 'center');
        }
        for (var i = 0; i < n; i++) {
            var x = this.slotX(i);
            var sel = this._cursor === i;
            if (this._labels[i]) {
                b.fontSize = 16;
                b.textColor = this.systemColor();
                b.drawText(String(this._labels[i]), x - 6, this.titleH(), this._slotW + 12, 26, 'center');
            }
            var cx = x + this._slotW / 2;
            this.drawTriangle(cx, top + 4, true, sel);
            roundRect(b, x, top + DIAL_ARROW, this._slotW, DIAL_BOX, 8,
                'rgba(0,0,0,0.55)', sel ? 'rgba(255,214,120,1)' : 'rgba(255,224,160,0.55)', sel ? 3 : 2);
            b.fontSize = this._fontSize;
            b.textColor = '#ffffff';
            b.drawText(String(this._slots[i][this._values[i]]), x, top + DIAL_ARROW, this._slotW, DIAL_BOX, 'center');
            this.drawTriangle(cx, top + DIAL_ARROW + DIAL_BOX + 4, false, sel);
        }
        var r = this.btnRect();
        var on = this._cursor === n;
        roundRect(b, r.x, r.y, r.w, r.h, 8, on ? 'rgba(70,140,80,0.95)' : 'rgba(60,110,70,0.75)',
            on ? 'rgba(255,214,120,1)' : 'rgba(255,255,255,0.35)', on ? 3 : 1);
        b.fontSize = 20;
        b.textColor = '#ffffff';
        b.drawText('확인', r.x, r.y, r.w, r.h, 'center');
    };

    Window_EscDial.prototype.drawTriangle = function(cx, y, up, sel) {
        var ctx = ctxOf(this.contents);
        ctx.save();
        ctx.fillStyle = sel ? 'rgba(255,214,120,1)' : 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        if (up) {
            ctx.moveTo(cx, y);
            ctx.lineTo(cx - 11, y + 16);
            ctx.lineTo(cx + 11, y + 16);
        } else {
            ctx.moveTo(cx, y + 16);
            ctx.lineTo(cx - 11, y);
            ctx.lineTo(cx + 11, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        setDirty(this.contents);
    };

    Window_EscDial.prototype.turn = function(i, delta) {
        var len = this._slots[i].length;
        this._values[i] = (this._values[i] + delta + len) % len;
        SoundManager.playCursor();
        this.refresh();
    };

    Window_EscDial.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (!this.active || !this.isOpen() || this._openFrame === Graphics.frameCount) return;
        var n = this._slots.length;
        if (Input.isRepeated('left')) {
            this._cursor = (this._cursor + n) % (n + 1);
            SoundManager.playCursor();
            this.refresh();
        } else if (Input.isRepeated('right')) {
            this._cursor = (this._cursor + 1) % (n + 1);
            SoundManager.playCursor();
            this.refresh();
        } else if (Input.isRepeated('up') && this._cursor < n) {
            this.turn(this._cursor, 1);
        } else if (Input.isRepeated('down') && this._cursor < n) {
            this.turn(this._cursor, -1);
        } else if (Input.isTriggered('ok')) {
            if (this._cursor === n) {
                this.callHandler('submit');
            } else {
                this._cursor++;
                SoundManager.playCursor();
                this.refresh();
            }
        } else if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
            SoundManager.playCancel();
            this.callHandler('cancel');
        } else if (escTappedOutside(this)) {
            SoundManager.playCancel();
            this.callHandler('cancel');
        } else if (TouchInput.isTriggered()) {
            this.onClick(this.canvasToLocalX(TouchInput.x) - this.padding, this.canvasToLocalY(TouchInput.y) - this.padding);
        }
    };

    Window_EscDial.prototype.onClick = function(x, y) {
        var top = this.labelH();
        var r = this.btnRect();
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
            this._cursor = this._slots.length;
            this.refresh();
            this.callHandler('submit');
            return;
        }
        for (var i = 0; i < this._slots.length; i++) {
            var sx = this.slotX(i);
            if (x < sx - 4 || x >= sx + this._slotW + 4) continue;
            this._cursor = i;
            if (y >= top - 4 && y < top + DIAL_ARROW) {
                this.turn(i, 1);
            } else if (y >= top + DIAL_ARROW && y < top + DIAL_ARROW + DIAL_BOX) {
                this.turn(i, 1);
            } else if (y >= top + DIAL_ARROW + DIAL_BOX && y < top + DIAL_ARROW * 2 + DIAL_BOX + 4) {
                this.turn(i, -1);
            } else {
                this.refresh();
            }
            return;
        }
    };

    //=========================================================================
    // Window_EscBag - 가방 (힌트 + 모은 물건)
    //=========================================================================
    function Window_EscBag() {
        this.initialize.apply(this, arguments);
    }
    Window_EscBag.prototype = Object.create(Window_Selectable.prototype);
    Window_EscBag.prototype.constructor = Window_EscBag;

    Window_EscBag.prototype.initialize = function() {
        var w = 460;
        this._rows = [];
        this._icons = {};
        Window_Selectable.prototype.initialize.call(this, (SW() - w) / 2, 0, w, this.fittingHeight(2));
        this.openness = 0;
        this.deactivate();
    };

    Window_EscBag.prototype.standardFontSize = function() { return 22; };
    Window_EscBag.prototype.itemHeight = function() { return 52; };
    Window_EscBag.prototype.maxItems = function() { return this._rows.length; };
    Window_EscBag.prototype.titleHeight = function() { return 40; };

    Window_EscBag.prototype.itemRect = function(index) {
        var rect = Window_Selectable.prototype.itemRect.call(this, index);
        rect.y += this.titleHeight();
        return rect;
    };

    Window_EscBag.prototype.setup = function(rows, index) {
        this._rows = rows;
        var visible = Math.min(rows.length, 7);
        this.height = this.standardPadding() * 2 + this.titleHeight() + visible * this.itemHeight();
        this.y = Math.max(HUD_H + 6, (SH() - this.height) / 2 - 20);
        this.createContents();
        this.refresh();
        this.select(Math.min(index || 0, rows.length - 1));
        this.open();
        this.activate();
        this._openFrame = Graphics.frameCount;
    };

    Window_EscBag.prototype.currentRow = function() { return this._rows[this.index()]; };

    Window_EscBag.prototype.isCurrentItemEnabled = function() {
        var r = this.currentRow();
        return !!r && r.enabled !== false;
    };

    Window_EscBag.prototype.refresh = function() {
        if (!this.contents) return;
        this.contents.clear();
        this.resetFontSettings();
        this.changeTextColor(this.systemColor());
        this.drawText('가방', 0, 0, this.contentsWidth(), 'center');
        this.resetTextColor();
        this.drawAllItems();
    };

    Window_EscBag.prototype.drawItem = function(index) {
        var r = this._rows[index];
        var rect = this.itemRect(index);
        this.resetFontSettings();
        if (r.hint) {
            roundRect(this.contents, rect.x + 2, rect.y + 4, rect.width - 4, rect.height - 8, 8,
                r.enabled === false ? 'rgba(90,90,90,0.5)' : 'rgba(200,150,60,0.55)', null);
        }
        var tx = rect.x + 12;
        if (r.image) {
            var bmp = this._icons[r.image];
            if (!bmp) {
                bmp = ImageManager.loadPicture(r.image);
                this._icons[r.image] = bmp;
                bmp.addLoadListener(this.refresh.bind(this));
            }
            if (bmp.isReady() && bmp.width > 0) {
                var s = Math.min(40 / bmp.width, 40 / bmp.height);
                var dw = Math.floor(bmp.width * s);
                var dh = Math.floor(bmp.height * s);
                this.contents.blt(bmp, 0, 0, bmp.width, bmp.height, rect.x + 8 + (40 - dw) / 2, rect.y + (rect.height - dh) / 2, dw, dh);
            }
            tx = rect.x + 58;
        }
        this.changePaintOpacity(r.enabled !== false);
        this.contents.drawText(r.text, tx, rect.y, rect.width - (tx - rect.x) - 8, rect.height, 'left');
        this.changePaintOpacity(true);
    };

    Window_EscBag.prototype.onTouch = function(triggered) {
        var x = this.canvasToLocalX(TouchInput.x);
        var y = this.canvasToLocalY(TouchInput.y);
        var hit = this.hitTest(x, y);
        if (hit >= 0) {
            if (hit !== this.index()) {
                this.select(hit);
                SoundManager.playCursor();
            }
            if (triggered && this.isCurrentItemEnabled()) this.processOk();
        }
    };

    // 창이 열린 바로 그 프레임의 입력(ESC, 클릭)으로 다시 닫히지 않도록
    [Window_EscChoice, Window_EscNumpad, Window_EscBag].forEach(function(Klass) {
        var _processHandling = Klass.prototype.processHandling;
        Klass.prototype.processHandling = function() {
            if (this._openFrame === Graphics.frameCount) return;
            _processHandling.call(this);
        };
        var _processTouch = Klass.prototype.processTouch;
        Klass.prototype.processTouch = function() {
            if (this._openFrame === Graphics.frameCount) return;
            if (this.isOpenAndActive() && this.isCancelEnabled() && escTappedOutside(this)) {
                this.processCancel();
                return;
            }
            _processTouch.call(this);
        };
    });

    //=========================================================================
    // EscapeManager - 게임 진행을 관리합니다
    //=========================================================================
    EscapeManager = {
        _scene: null,

        reset: function() {
            this._data = $dataEscape;
            this._flags = {};
            this._items = [];
            this._visited = {};
            this._hintLevel = {};
            this._hintsLeft = Number((this._data && this._data.hints) || 0);
            this._hintsUsed = 0;
            this._timeLeft = Number((this._data && this._data.timeLimit) || 0);
            this._elapsed = 0;
            this._queue = [];
            this._waiting = false;
            this._waitCount = 0;
            this._waitTransfer = false;
            this._afterQueue = null;
            this._bagOpen = false;
            this._bagIndex = 0;
            this._phase = 'new';
            this._lastModalFrame = -1;
            this._started = true;
        },

        isActive: function() {
            return !!this._started && !!this._data;
        },

        hasError: function() {
            return !this._data || !!this._data.__error || (this._errors && this._errors.length > 0);
        },

        // --- 방과 조사 지점 -------------------------------------------------
        rooms: function() {
            return toArray(this._data && this._data.rooms);
        },

        roomById: function(id) {
            var list = this.rooms();
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) return list[i];
            }
            return null;
        },

        roomForMap: function(mapId) {
            var list = this.rooms();
            for (var i = 0; i < list.length; i++) {
                if (Number(list[i].map) === mapId) return list[i];
            }
            return null;
        },

        isRoomMap: function(mapId) {
            return this.isActive() && !this.hasError() && !!this.roomForMap(mapId);
        },

        currentRoom: function() {
            return $gameMap ? this.roomForMap($gameMap.mapId()) : null;
        },

        hotspotById: function(room, id) {
            if (!room || !id) return null;
            var list = toArray(room.hotspots);
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === id) return list[i];
            }
            return null;
        },

        hotspotForEvent: function(event) {
            if (!this.isActive() || this.hasError()) return null;
            var data = event.event ? event.event() : null;
            if (!data) return null;
            return this.hotspotById(this.roomForMap($gameMap.mapId()), String(data.name).trim());
        },

        // --- 조건 -------------------------------------------------------------
        hasItem: function(id) {
            return this._items.indexOf(id) >= 0;
        },

        checkCond: function(c) {
            if (!c) return true;
            var self = this;
            var ok = true;
            toArray(c.flag).concat(toArray(c.flags)).forEach(function(f) { if (!self._flags[f]) ok = false; });
            toArray(c.noFlag).concat(toArray(c.noFlags)).forEach(function(f) { if (self._flags[f]) ok = false; });
            toArray(c.item).concat(toArray(c.items)).forEach(function(it) { if (!self.hasItem(it)) ok = false; });
            toArray(c.noItem).concat(toArray(c.noItems)).forEach(function(it) { if (self.hasItem(it)) ok = false; });
            return ok;
        },

        // --- 상태 -------------------------------------------------------------
        isBusy: function() {
            if (!this.isActive()) return false;
            if (this._phase === 'error' || this._phase === 'ending' || this._phase === 'done' || this._phase === 'new') return true;
            return this._queue.length > 0 || this._waiting || this._waitCount > 0 ||
                this._waitTransfer || this._bagOpen;
        },

        canInteract: function() {
            return this.isActive() && this._phase === 'play' && !this.isBusy();
        },

        // --- 장면 연결 --------------------------------------------------------
        onSceneStart: function(scene) {
            this._scene = scene;
            if (!this.isActive()) return;
            if (this._data.__error) {
                this._phase = 'error';
                scene.escShowError([this._data.__error]);
                return;
            }
            if (this._errors && this._errors.length > 0) {
                this._phase = 'error';
                scene.escShowError(this._errors);
                return;
            }
            this._waitTransfer = false;
            scene.escRefreshHud();
            this.reportMissingEvents();
            var firstIntro = toArray(this._data.intro)[0];
            if (this._phase !== 'new' || !(firstIntro && firstIntro.movie && hasAsset('movie', firstIntro.movie))) {
                this.updateBgm();
            }
            if (this._phase === 'new') {
                this._phase = 'intro';
                this.runSteps(toArray(this._data.intro), function() {
                    this.hideCloseup();
                    this._phase = 'play';
                    this.refreshHud();
                    this.enterRoom();
                }.bind(this));
            } else {
                this.enterRoom();
            }
        },

        enterRoom: function() {
            var room = this.currentRoom();
            if (room && !this._visited[room.id] && this._scene && this._scene.escTitleCard) {
                this._scene.escTitleCard(room.name || room.id);
            }
            if (room && room.enter && !this._visited[room.id]) {
                this._visited[room.id] = true;
                if (this._queue.length > 0 || this._waiting) {
                    this.insertSteps(toArray(room.enter));
                } else {
                    this.runSteps(toArray(room.enter));
                }
            }
            if (room) this._visited[room.id] = true;
        },

        reportMissingEvents: function() {
            var room = this.currentRoom();
            if (!room) return;
            var names = {};
            $gameMap.events().forEach(function(ev) {
                names[String(ev.event().name).trim()] = true;
            });
            var missing = toArray(room.hotspots).filter(function(h) { return !names[h.id]; })
                .map(function(h) { return h.id; });
            if (missing.length > 0) {
                console.warn('EscapeRoom: 맵 ' + room.map + '번(' + room.id + ')에 이 이름의 이벤트가 없습니다: ' + missing.join(', '));
            }
            this._missing = missing;
        },

        refreshHud: function() {
            if (this._scene && this._scene.escRefreshHud) this._scene.escRefreshHud();
        },

        // --- 데이터 검사 -----------------------------------------------------
        validate: function() {
            var d = this._data;
            var errors = [];
            if (!Array.isArray(d.rooms) || d.rooms.length === 0) return ['rooms(방 목록)가 비어 있습니다.'];
            var roomIds = {};
            var mapIds = {};
            d.rooms.forEach(function(r) {
                roomIds[r.id] = true;
                if (!r.map) {
                    errors.push('방 "' + r.id + '"에 map(맵 번호)이 없습니다.');
                } else if (!$dataMapInfos[Number(r.map)]) {
                    errors.push('방 "' + r.id + '": ' + r.map + '번 맵이 프로젝트에 없습니다.');
                } else if (mapIds[r.map]) {
                    errors.push('방 "' + r.id + '"과 "' + mapIds[r.map] + '"이 같은 ' + r.map + '번 맵을 쓰고 있습니다.');
                }
                mapIds[r.map] = r.id;
            });
            var items = d.items || {};
            var check = function(steps, where) {
                toArray(steps).forEach(function(s) {
                    if (!s || typeof s !== 'object') return;
                    if (s.go && !roomIds[s.go]) errors.push(where + ': 없는 방 "' + s.go + '"(으)로 이동하려 합니다.');
                    toArray(s.give).concat(toArray(s.take)).forEach(function(it) {
                        if (!items[it]) errors.push(where + ': items에 없는 아이템 "' + it + '"');
                    });
                    if (s.dial) {
                        var ds = EscapeManager.dialSlots(s.dial);
                        var da = toArray(s.dial.answer).map(String);
                        if (da.length !== ds.length) errors.push(where + ': 다이얼 칸 수(' + ds.length + ')와 정답 개수(' + da.length + ')가 다릅니다.');
                        da.forEach(function(v, i) {
                            if (ds[i] && ds[i].indexOf(v) < 0) errors.push(where + ': 다이얼 ' + (i + 1) + '번째 칸에 정답 "' + v + '"이(가) 보기 목록에 없습니다.');
                        });
                    }
                    check(s.success, where);
                    check(s.fail, where);
                    check(s.cancel, where);
                });
            };
            var checkCond = function(c, where) {
                if (!c) return;
                toArray(c.item).concat(toArray(c.items), toArray(c.noItem), toArray(c.noItems)).forEach(function(it) {
                    if (!items[it]) errors.push(where + ': 조건에 쓴 아이템 "' + it + '"이(가) items에 없습니다.');
                });
            };
            if (d.startRoom && !roomIds[d.startRoom]) errors.push('startRoom "' + d.startRoom + '"이(가) 없습니다.');
            check(d.intro, '도입(intro)');
            d.rooms.forEach(function(r) {
                if (!r.start) errors.push('방 "' + r.id + '"에 start(도착 위치)가 없습니다.');
                check(r.enter, '방 "' + r.id + '"의 enter');
                var seen = {};
                toArray(r.hotspots).forEach(function(h) {
                    var where = '방 "' + r.id + '" > "' + h.id + '"';
                    if (!h.id) errors.push('방 "' + r.id + '"에 id가 없는 조사 지점이 있습니다.');
                    if (seen[h.id]) errors.push(where + ': 같은 id가 두 번 있습니다.');
                    seen[h.id] = true;
                    checkCond(h.when, where);
                    if (h.cases) {
                        toArray(h.cases).forEach(function(c) {
                            checkCond(c['if'], where);
                            check(c.steps, where);
                        });
                    } else {
                        check(h.steps, where);
                    }
                });
            });
            return errors;
        },

        // --- 새 게임 시작 위치 --------------------------------------------------
        startPosition: function() {
            if (this.hasError()) return null;
            var id = this._data.startRoom || this._data.rooms[0].id;
            var room = this.roomById(id);
            if (!room || !room.start) return null;
            var s = toArray(room.start);
            return { mapId: Number(room.map), x: Number(s[0]), y: Number(s[1]), d: toDir(s[2]) || 2 };
        },

        // --- 조사 ----------------------------------------------------------------
        triggerHotspot: function(h) {
            if (!this.canInteract()) return;
            if (!this.checkCond(h.when)) return;
            var steps = null;
            if (h.cases) {
                var cases = toArray(h.cases);
                for (var i = 0; i < cases.length; i++) {
                    if (this.checkCond(cases[i]['if'])) {
                        steps = cases[i].steps;
                        break;
                    }
                }
            } else {
                steps = h.steps;
            }
            if (!steps) steps = [{ text: '특별한 것은 없어 보인다.' }];
            $gameTemp.clearDestination();
            this.runSteps(toArray(steps), this.hideCloseup.bind(this));
        },

        // --- 단계 실행기 -----------------------------------------------------------
        runSteps: function(steps, onDone) {
            this._queue = toArray(steps).slice();
            this._afterQueue = onDone || null;
            this._waiting = false;
        },

        insertSteps: function(steps) {
            this._queue = toArray(steps).concat(this._queue);
        },

        resume: function() {
            this._waiting = false;
            this._lastModalFrame = Graphics.frameCount;
        },

        update: function(scene) {
            if (!this.isActive() || scene !== this._scene) return;
            if (this._phase === 'error' || this._phase === 'done') return;
            if (this._movie) {
                this.updateMovie();
                return;
            }
            this.updateTimer();
            if (this._waitTransfer) return;
            if (this._waitCount > 0) {
                this._waitCount--;
            } else {
                while (!this._waiting && this._waitCount === 0 && !this._waitTransfer &&
                       this._queue.length > 0 && !scene.isBusy()) {
                    this.processStep(this._queue.shift());
                }
                if (!this._waiting && this._waitCount === 0 && !this._waitTransfer &&
                    this._queue.length === 0 && this._afterQueue) {
                    var cb = this._afterQueue;
                    this._afterQueue = null;
                    cb();
                }
            }
        },

        updateTimer: function() {
            if (this._phase !== 'play') return;
            this._elapsed += 1 / 60;
            if (!this._data.timeLimit) return;
            var before = Math.ceil(this._timeLeft);
            this._timeLeft -= 1 / 60;
            if (Math.ceil(this._timeLeft) !== before) this.refreshHud();
            if (this._timeLeft <= 0) {
                this._timeLeft = 0;
                this.finishGame(false);
            }
        },

        processStep: function(s) {
            if (typeof s === 'string') s = { text: s };
            if (!s || typeof s !== 'object') return;
            var self = this;
            var scene = this._scene;

            if (s.picture) this.showCloseup(s.picture, s._maxScale);
            if (s.hidePicture) this.hideCloseup();
            if (s.se) playSafeSe(String(s.se), 90, 100);
            if (s.bgm !== undefined) this.playBgm(String(s.bgm || ''));
            if (s.effect) this.playEffect(s);
            if (s.give) {
                toArray(s.give).forEach(function(it) {
                    if (!self.hasItem(it)) self._items.push(it);
                    if (scene && scene.escItemPopup) scene.escItemPopup(it);
                });
                if (!playSafeSe(SE_ITEM, 90, 100)) SoundManager.playUseItem();
            }
            if (s.take) {
                toArray(s.take).forEach(function(it) {
                    var i = self._items.indexOf(it);
                    if (i >= 0) self._items.splice(i, 1);
                });
            }
            if (s.flag) toArray(s.flag).forEach(function(f) { self._flags[f] = true; });
            if (s.unflag) toArray(s.unflag).forEach(function(f) { delete self._flags[f]; });
            if (s.solve) {
                toArray(s.solve).forEach(function(f) { self._flags[f] = true; });
                if (!playSafeSe(SE_SOLVE, 90, 100)) SoundManager.playRecovery();
                if (scene && scene.escSolveFx) scene.escSolveFx();
            }
            if (s.penalty) this.applyPenalty(Number(s.penalty));
            if (s.give || s.take || s.solve || s.flag || s.unflag) this.refreshHud();

            if (s.effect === 'gate') {
                this._waiting = true;
                scene.escStartGate(s, this.resume.bind(this));
                return;
            }
            if (s.lock) {
                this.startLock(s);
                return;
            }
            if (s.choice) {
                this.startChoice(s);
                return;
            }
            if (s.dial) {
                this.startDial(s);
                return;
            }
            if (s.movie) {
                if (this.startMovie(s)) return;
            }
            if (s.selectCharacter) {
                this.startSelectCharacter(s);
                return;
            }
            if (s.text !== undefined) {
                if (s.go || s.escape || s.wait) {
                    this.insertSteps([{ go: s.go, x: s.x, y: s.y, dir: s.dir, fade: s.fade, escape: s.escape, wait: s.wait }]);
                }
                this._waiting = true;
                scene._escMsg.say(s.text, s.speaker, this.resume.bind(this), true);
                if (s.openUrl) scene.escArmUrl(String(s.openUrl));
                return;
            }
            if (s.go) {
                this.startTransfer(s);
                return;
            }
            if (s.wait) {
                this._waitCount = Number(s.wait);
                return;
            }
            if (s.escape) {
                this.finishGame(true);
                return;
            }
        },

        // --- 배경 음악 --------------------------------------------------------------
        playBgm: function(name) {
            if (!name) {
                AudioManager.fadeOutBgm(1);
                return;
            }
            if (hasAsset('bgm', name)) {
                AudioManager.playBgm({ name: name, volume: 80, pitch: 100, pan: 0 });
            }
        },

        updateBgm: function() {
            var room = this.currentRoom();
            var name = (room && room.bgm) || this._data.bgm;
            if (name) this.playBgm(name);
        },

        // --- 영상 ------------------------------------------------------------------
        startMovie: function(s) {
            var name = String(s.movie);
            if (!hasAsset('movie', name)) return false;
            AudioManager.stopBgm();
            this._waiting = true;
            this._movie = { frames: 0 };
            Graphics._escVideoCancelled = false;
            Graphics.playVideo('movies/' + encodeURIComponent(name) + videoExt());
            return true;
        },

        updateMovie: function() {
            var m = this._movie;
            m.frames++;
            var v = Graphics._video;
            var skip = m.frames > 20 && (Input.isTriggered('ok') || Input.isTriggered('cancel') ||
                TouchInput.isTriggered() || TouchInput.isCancelled());
            var stalled = (m.frames > 150 && v && v.paused && !Graphics._videoLoading && v.currentTime === 0) ||
                (m.frames > 360 && v && (v.error || v.currentTime === 0));
            if ((skip || stalled) && Graphics.isVideoPlaying()) {
                if (v) { v.pause(); v.onerror = null; v.removeAttribute('src'); try { v.load(); } catch (e) {} }
                Graphics._escVideoCancelled = true;
                Graphics._videoLoading = false;
                Graphics._onVideoEnd();
            }
            if (m.frames > 10 && !Graphics.isVideoPlaying()) {
                this._movie = null;
                this.updateBgm();
                this.resume();
            }
        },

        // --- 효과 ------------------------------------------------------------------
        playEffect: function(s) {
            var scene = this._scene;
            var kind = String(s.effect);
            if (kind === 'door') {
                if (scene) scene.escFxDoor(s.target || 'exit');
                this._waitCount = Math.max(this._waitCount, Number(s.wait || 45));
            } else if (kind === 'flash') {
                var c = toArray(s.color).length === 4 ? s.color : [255, 255, 255, 200];
                $gameScreen.startFlash(c, Number(s.duration || 30));
            } else if (kind === 'shake') {
                $gameScreen.startShake(Number(s.power || 5), Number(s.speed || 8), Number(s.duration || 24));
            } else if (kind === 'sparkle') {
                if (scene) scene.escSparkleAt(s.target);
            } else if (kind === 'card') {
                if (scene) scene.escTitleCard(String(s.text || ''));
            }
        },

        wrongFx: function() {
            $gameScreen.startShake(5, 9, 18);
        },

        startTransfer: function(s) {
            var room = this.roomById(s.go);
            var start = toArray(room.start);
            var x = s.x !== undefined ? Number(s.x) : Number(start[0]);
            var y = s.y !== undefined ? Number(s.y) : Number(start[1]);
            var d = s.dir !== undefined ? toDir(s.dir) : (toDir(start[2]) || 0);
            this.hideCloseup();
            this._waitTransfer = true;
            $gameTemp.clearDestination();
            var white = s.fade === 'white';
            if (white) playSafeSe(SE_WARP, 80, 100);
            $gamePlayer.reserveTransfer(Number(room.map), x, y, d, white ? 1 : 0);
        },

        applyPenalty: function(sec) {
            if (this._data.timeLimit && this._timeLeft > 0) {
                this._timeLeft = Math.max(1, this._timeLeft - sec);
                this.refreshHud();
            }
        },

        // --- 자물쇠 ---------------------------------------------------------------
        startLock: function(s) {
            var self = this;
            var scene = this._scene;
            var lock = s.lock;
            var answer = String(lock.answer);
            var digits = Number(lock.digits || answer.length);
            this._waiting = true;
            scene._escMsg.say(lock.question || (digits + '자리 숫자를 입력하세요.'), s.speaker, null, false);
            var pad = scene._escNumpad;
            pad.setup(digits, scene._escMsg.y);
            pad.setHandler('ok', function() {});
            pad.setHandler('submit', function() {
                if (!pad.isFull()) {
                    SoundManager.playBuzzer();
                    pad.activate();
                    return;
                }
                var correct = pad.value() === answer;
                pad.deactivate();
                pad.close();
                scene._escMsg.dismiss();
                if (correct) {
                    SoundManager.playOk();
                    self.insertSteps(toArray(s.success));
                } else {
                    SoundManager.playBuzzer();
                    self.wrongFx();
                    if (self._data.wrongPenalty) self.applyPenalty(Number(self._data.wrongPenalty));
                    self.insertSteps(s.fail ? toArray(s.fail) : [{ text: '딸깍... 열리지 않는다. 다시 생각해 보자.' }]);
                }
                self.resume();
            });
            pad.setHandler('cancel', function() {
                pad.deactivate();
                pad.close();
                scene._escMsg.dismiss();
                self.insertSteps(toArray(s.cancel));
                self.resume();
            });
        },

        // --- 다이얼 자물쇠 -----------------------------------------------------------
        dialSlots: function(d) {
            if (Array.isArray(d.slots)) {
                return d.slots.map(function(list) { return toArray(list).map(String); });
            }
            var syms = toArray(d.symbols).map(String);
            var n = Number(d.count || toArray(d.answer).length || 1);
            var out = [];
            for (var i = 0; i < n; i++) out.push(syms.slice());
            return out;
        },

        startDial: function(s) {
            var self = this;
            var scene = this._scene;
            var d = s.dial;
            var answer = toArray(d.answer).map(String);
            this._waiting = true;
            var win = scene._escDial;
            var question = d.question || '자물쇠를 돌려 맞춰 보자.';
            if (scene.escCloseupVisible()) {
                // 단서 그림을 보면서 풀 수 있도록: 다이얼은 화면 아래, 그림은 그 위로
                win.setup(this.dialSlots(d), d.labels, SH() + 36, question);
                scene.escFitCloseup(win.y - 6);
            } else {
                scene._escMsg.say(question, s.speaker, null, false);
                win.setup(this.dialSlots(d), d.labels, scene._escMsg.y);
            }
            win.setHandler('submit', function() {
                var vals = win.values();
                var correct = vals.length === answer.length && vals.every(function(v, i) { return v === answer[i]; });
                win.deactivate();
                win.close();
                scene._escMsg.dismiss();
                if (correct) {
                    SoundManager.playOk();
                    self.insertSteps(toArray(s.success));
                } else {
                    SoundManager.playBuzzer();
                    self.wrongFx();
                    if (self._data.wrongPenalty) self.applyPenalty(Number(self._data.wrongPenalty));
                    self.insertSteps(s.fail ? toArray(s.fail) : [{ text: '철컥... 맞지 않는다. 다시 생각해 보자.' }]);
                }
                self.resume();
            });
            win.setHandler('cancel', function() {
                win.deactivate();
                win.close();
                scene._escMsg.dismiss();
                self.insertSteps(toArray(s.cancel));
                self.resume();
            });
        },

        // --- 주인공 고르기 -----------------------------------------------------------
        characters: function() {
            return toArray(this._data && this._data.characters);
        },

        applyCharacter: function(c) {
            var actor = $gameParty.leader();
            if (!actor || !c || !c.image) return;
            actor.setCharacterImage(String(c.image), Number(c.index || 0));
            if (c.face) actor.setFaceImage(String(c.face), Number(c.faceIndex || 0));
            $gamePlayer.refresh();
        },

        startSelectCharacter: function(s) {
            var self = this;
            var scene = this._scene;
            var list = this.characters();
            if (list.length === 0) return;
            this._waiting = true;
            scene._escMsg.say(s.question || '누구로 시작할까요?', s.speaker, null, false);
            var win = scene._escChoice;
            win.setup(list.map(function(c) { return c.label || c.image; }), scene._escMsg.y);
            var handler = function() {
                var c = list[win.index()];
                win.deactivate();
                win.close();
                scene._escMsg.dismiss();
                self.applyCharacter(c);
                SoundManager.playOk();
                self.resume();
            };
            for (var i = 0; i < list.length; i++) win.setHandler('choice' + i, handler);
        },

        // --- 선택지 ---------------------------------------------------------------
        startChoice: function(s) {
            var self = this;
            var scene = this._scene;
            var options = toArray(s.choice);
            var answer = Number(s.answer || 0);
            this._waiting = true;
            scene._escMsg.say(s.question || '', s.speaker, null, false);
            var win = scene._escChoice;
            win.setup(options, scene._escMsg.y);
            var handler = function() {
                var picked = win.index() + 1;
                win.deactivate();
                win.close();
                scene._escMsg.dismiss();
                if (!answer) {
                    self.insertSteps(toArray(s['on' + picked]));
                } else if (picked === answer) {
                    SoundManager.playOk();
                    self.insertSteps(toArray(s.success));
                } else {
                    SoundManager.playBuzzer();
                    self.wrongFx();
                    if (self._data.wrongPenalty) self.applyPenalty(Number(self._data.wrongPenalty));
                    self.insertSteps(s.fail ? toArray(s.fail) : [{ text: '아니야... 다시 생각해 보자.' }]);
                }
                self.resume();
            };
            for (var i = 0; i < options.length; i++) {
                win.setHandler('choice' + i, handler);
            }
        },

        // --- 확대 그림 ------------------------------------------------------------
        showCloseup: function(name, maxScale) {
            if (this._scene) this._scene.escShowCloseup(name, maxScale);
        },

        hideCloseup: function() {
            if (this._scene) this._scene.escHideCloseup();
        },

        // --- 가방 ------------------------------------------------------------------
        bagRows: function() {
            var rows = [];
            var items = this._data.items || {};
            if (this._data.hints) {
                rows.push({ hint: true, text: '힌트 보기   (남은 횟수 ' + this._hintsLeft + '/' + this._data.hints + ')' });
            }
            this._items.forEach(function(id) {
                var info = items[id] || { name: id };
                rows.push({ item: id, text: info.name, image: info.image });
            });
            if (this._items.length === 0) rows.push({ text: '아직 모은 물건이 없다.', enabled: false });
            return rows;
        },

        openBag: function() {
            if (!this.canInteract()) return;
            var scene = this._scene;
            var self = this;
            var bag = scene._escBag;
            this._bagOpen = true;
            $gameTemp.clearDestination();
            SoundManager.playOk();
            bag.setup(this.bagRows(), this._bagIndex);
            bag.setHandler('ok', function() {
                var r = bag.currentRow();
                self._bagIndex = bag.index();
                bag.deactivate();
                bag.close();
                self._bagOpen = false;
                if (r.hint) {
                    self.onHint();
                } else if (r.item) {
                    self.showItem(r.item);
                }
            });
            bag.setHandler('cancel', function() {
                self._bagIndex = bag.index();
                bag.deactivate();
                bag.close();
                self._bagOpen = false;
                self.resume();
            });
        },

        showItem: function(id) {
            var info = (this._data.items || {})[id] || { name: id };
            var step = { text: info.desc || '', speaker: info.name };
            if (info.closeup || info.image) {
                step.picture = info.closeup || info.image;
                step._maxScale = info.closeup ? 1 : 2.5;
            }
            this.runSteps([step], function() {
                this.hideCloseup();
                this.openBagAfter = true;
            }.bind(this));
        },

        // --- 힌트 ------------------------------------------------------------------
        currentPuzzle: function() {
            var list = toArray(this._data.puzzles);
            for (var i = 0; i < list.length; i++) {
                if (!this._flags[list[i].id]) return list[i];
            }
            return null;
        },

        onHint: function() {
            if (!this._data.hints) return;
            var p = this.currentPuzzle();
            if (!p) {
                this.runSteps([{ speaker: '힌트', text: '이제 남은 수수께끼가 없어요. 출구를 찾아보세요!' }]);
                return;
            }
            var hints = toArray(p.hints);
            var level = this._hintLevel[p.id] || 0;
            if (level >= hints.length) {
                this.runSteps([{ speaker: '힌트 - ' + (p.name || p.id), text: hints[hints.length - 1] || '힌트가 없습니다.' }]);
                return;
            }
            if (this._hintsLeft <= 0) {
                SoundManager.playBuzzer();
                this.runSteps([{ speaker: '힌트', text: '힌트를 모두 사용했어요. 지금까지 모은 단서를 다시 살펴보세요.' }]);
                return;
            }
            this._hintsLeft--;
            this._hintsUsed++;
            this._hintLevel[p.id] = level + 1;
            this.refreshHud();
            SoundManager.playOk();
            this.runSteps([{ speaker: '힌트 ' + (level + 1) + ' - ' + (p.name || p.id), text: hints[level] }]);
        },

        // --- 끝내기 ----------------------------------------------------------------
        finishGame: function(success) {
            var scene = this._scene;
            this._phase = 'ending';
            this._queue = [];
            this._afterQueue = null;
            this._waiting = false;
            this._waitCount = 0;
            this._bagOpen = false;
            if (scene) scene.escCloseAll();
            this.hideCloseup();
            this.refreshHud();
            var ending = this._data.ending || {};
            var steps = [];
            if (success && this._data.endingBgm) {
                this.playBgm(this._data.endingBgm);
            } else if (!success) {
                AudioManager.fadeOutBgm(3);
            }
            if (success) {
                steps = steps.concat(toArray(ending.success));
                var used = Math.round(this._elapsed);
                var record = '탈출 성공!\n걸린 시간: ' + Math.floor(used / 60) + '분 ' + (used % 60) + '초';
                if (this._data.hints) record += '\n사용한 힌트: ' + this._hintsUsed + '개';
                steps.push({ speaker: '기록', text: record });
            } else {
                steps = steps.concat(toArray(ending.fail || '시간이 다 되었습니다...'));
            }
            steps = steps.concat(toArray(ending.summary));
            var review = this._data.review;
            if (review && review.url) {
                steps.push({ picture: review.picture, speaker: review.speaker || '후기', openUrl: review.url,
                    text: review.text || '끝까지 함께해 줘서 고마워요! Enter나 클릭을 누르면 후기 페이지가 열려요.' });
            }
            this._queue = steps;
            this._afterQueue = function() {
                this._phase = 'done';
                this._started = false;
                if (this._scene) this._scene.fadeOutAll();
                SceneManager.goto(Scene_Title);
            }.bind(this);
        }
    };

    //=========================================================================
    // 새 게임: 시작 방으로, 동료는 숨기기
    //=========================================================================
    var _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        _DataManager_setupNewGame.call(this);
        EscapeManager.reset();
        EscapeManager._errors = $dataEscape && !$dataEscape.__error ? EscapeManager.validate() : [];
        var pos = EscapeManager.startPosition();
        if (pos) {
            $gamePlayer.reserveTransfer(pos.mapId, pos.x, pos.y, pos.d, 0);
        }
        $gamePlayer.hideFollowers();
        var chars = EscapeManager.characters();
        if (chars.length > 0 && !EscapeManager.hasError()) EscapeManager.applyCharacter(chars[0]);
    };

    //=========================================================================
    // 이동 제한 / 벽 리전
    //=========================================================================
    var _Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() {
        if (EscapeManager.isActive() && EscapeManager.isBusy()) return false;
        return _Game_Player_canMove.call(this);
    };

    var _Game_Map_isPassable = Game_Map.prototype.isPassable;
    Game_Map.prototype.isPassable = function(x, y, d) {
        if (EscapeManager.isRoomMap(this.mapId())) {
            if (this.regionId(x, y) === WALL_REGION) return false;
            if (this.layeredTiles(x, y).every(function(t) { return t === 0; })) return true;
        }
        return _Game_Map_isPassable.call(this, x, y, d);
    };

    //=========================================================================
    // 이벤트 = 조사 지점
    //=========================================================================
    var _Game_Event_isNormalPriority = Game_Event.prototype.isNormalPriority;
    Game_Event.prototype.isNormalPriority = function() {
        if (EscapeManager.hotspotForEvent(this)) return true;
        return _Game_Event_isNormalPriority.call(this);
    };

    var _Game_Event_start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        var h = EscapeManager.hotspotForEvent(this);
        if (h) {
            if (this.characterName() && !this.isDirectionFixed() && EscapeManager.canInteract()) {
                this.turnTowardPlayer();
            }
            EscapeManager.triggerHotspot(h);
            return;
        }
        _Game_Event_start.call(this);
    };

    //=========================================================================
    // Scene_Map - 화면 요소 추가
    //=========================================================================
    var _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        if (!EscapeManager.isActive()) return;
        this.escCreateLayer();
        this._escMsg = new Window_EscMessage();
        this._escName = new Window_EscName();
        this._escMsg.setNameWindow(this._escName);
        this._escChoice = new Window_EscChoice();
        this._escNumpad = new Window_EscNumpad();
        this._escBag = new Window_EscBag();
        this._escDial = new Window_EscDial();
        this.addWindow(this._escMsg);
        this.addWindow(this._escName);
        this.addWindow(this._escChoice);
        this.addWindow(this._escNumpad);
        this.addWindow(this._escBag);
        this.addWindow(this._escDial);
    };

    Scene_Map.prototype.escCreateLayer = function() {
        var at = this.getChildIndex(this._windowLayer);
        var add = function(sprite) { this.addChildAt(sprite, at++); }.bind(this);

        // 효과 층: 맵(캐릭터) 바로 위
        this._escFx = new Sprite();
        this.addChildAt(this._escFx, this.getChildIndex(this._spriteset) + 1);
        at = this.getChildIndex(this._windowLayer);
        this._escParticles = [];
        this._escOpenSprites = [];
        this._escOpenKey = null;

        this._escWhite = new Sprite(new Bitmap(SW(), SH()));
        this._escWhite.bitmap.fillAll('#fffaf0');
        this._escWhite.opacity = 0;
        add(this._escWhite);

        this._escCard = new Sprite(new Bitmap(SW(), 130));
        this._escCard.y = Math.floor(SH() * 0.28);
        this._escCard.opacity = 0;
        this._escCardT = 0;
        add(this._escCard);

        this._escToast = new Sprite(new Bitmap(360, 40));
        this._escToast.x = (SW() - 360) / 2;
        this._escToast.y = HUD_H + 8;
        this._escToast.opacity = 0;
        this._escToastT = 0;

        this._escDebug = new Sprite(new Bitmap(SW(), SH()));
        this._escDebug.visible = SHOW_DEBUG;
        add(this._escDebug);

        this._escTip = new Sprite(new Bitmap(300, 34));
        this._escTip.visible = false;
        this._escTipText = '';
        add(this._escTip);

        this._escDim = new Sprite(new Bitmap(SW(), SH()));
        this._escDim.bitmap.fillAll('rgba(0,0,0,0.6)');
        this._escDim.visible = false;
        add(this._escDim);

        this._escCloseup = new Sprite();
        this._escCloseup.anchor.x = 0.5;
        this._escCloseup.anchor.y = 0.5;
        this._escCloseup.x = SW() / 2;
        this._escCloseup.visible = false;
        add(this._escCloseup);

        this._escHud = new Sprite(new Bitmap(SW(), HUD_H));
        add(this._escHud);
        add(this._escToast);

        this._escError = new Sprite();
        add(this._escError);

        this._escDebugText = '';
    };

    var _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if (EscapeManager.isActive()) {
            this.escInstallKeys();
            EscapeManager.onSceneStart(this);
        }
    };

    var _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        _Scene_Map_terminate.call(this);
        this.escRemoveKeys();
    };

    // 브라우저는 사용자가 키를 누르거나 클릭한 순간에만 새 창을 허용하므로,
    // 그 순간(DOM 이벤트 안)에 링크를 엽니다.
    Scene_Map.prototype.escArmUrl = function(url) {
        this._escUrl = url;
        this._escUrlFrame = Graphics.frameCount;
    };

    Scene_Map.prototype.escTryOpenUrl = function() {
        if (!this._escUrl || !this._escMsg) return;
        if (Graphics.frameCount < this._escUrlFrame + 10) return;
        if (this._escMsg.isTyping()) return;
        var url = this._escUrl;
        this._escUrl = null;
        openExternal(url);
    };

    Scene_Map.prototype.escInstallKeys = function() {
        var self = this;
        this._escGesture = function(e) {
            if (SceneManager._scene !== self) return;
            if (e.type === 'keydown' && ['Enter', ' ', 'z', 'Z'].indexOf(e.key) < 0) return;
            if (e.type === 'mousedown' && e.button !== 0) return;
            self.escTryOpenUrl();
        };
        document.addEventListener('keydown', this._escGesture);
        document.addEventListener('mousedown', this._escGesture);
        document.addEventListener('touchend', this._escGesture);
        this._escKey = function(e) {
            if (!SceneManager._scene || SceneManager._scene !== self) return;
            if (self._escNumpad && self._escNumpad.active) {
                var k = e.key;
                if (k && k.length === 1 && k >= '0' && k <= '9') {
                    self._escNumpad.addDigit(k);
                    e.preventDefault();
                } else if (k === 'Backspace') {
                    self._escNumpad.backspace();
                    e.preventDefault();
                }
                return;
            }
            if ((e.key === 'h' || e.key === 'H' || e.key === 'ㅗ') && EscapeManager.canInteract()) {
                EscapeManager.onHint();
            }
        };
        this._escMouse = function(e) {
            var x = Graphics.pageToCanvasX(e.pageX);
            var y = Graphics.pageToCanvasY(e.pageY);
            var b = self.escButtonAt(x, y);
            document.body.style.cursor = b && EscapeManager.canInteract() ? 'pointer' : '';
        };
        document.addEventListener('keydown', this._escKey);
        document.addEventListener('mousemove', this._escMouse);
    };

    Scene_Map.prototype.escRemoveKeys = function() {
        if (this._escKey) document.removeEventListener('keydown', this._escKey);
        if (this._escMouse) document.removeEventListener('mousemove', this._escMouse);
        if (this._escGesture) {
            document.removeEventListener('keydown', this._escGesture);
            document.removeEventListener('mousedown', this._escGesture);
            document.removeEventListener('touchend', this._escGesture);
        }
        document.body.style.cursor = '';
    };

    var _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (!EscapeManager.isActive() || !this._escHud) return;
        EscapeManager.update(this);
        if (EscapeManager.openBagAfter && EscapeManager.canInteract()) {
            EscapeManager.openBagAfter = false;
            EscapeManager.openBag();
        }
        this.escUpdateTip();
        this.escUpdateFx();
        if (SHOW_DEBUG) this.escUpdateDebug();
    };

    // 가방 열기 (메뉴 대신)
    var _Scene_Map_isMenuEnabled = Scene_Map.prototype.isMenuEnabled;
    Scene_Map.prototype.isMenuEnabled = function() {
        if (EscapeManager.isActive()) return EscapeManager.canInteract() && !$gameMap.isEventRunning();
        return _Scene_Map_isMenuEnabled.call(this);
    };

    var _Scene_Map_callMenu = Scene_Map.prototype.callMenu;
    Scene_Map.prototype.callMenu = function() {
        if (EscapeManager.isActive()) {
            this.menuCalling = false;
            EscapeManager.openBag();
            return;
        }
        _Scene_Map_callMenu.call(this);
    };

    // 위쪽 버튼 클릭
    Scene_Map.prototype.escButtonRects = function() {
        var rects = [];
        var right = SW() - 8;
        if (EscapeManager._data && EscapeManager._data.hints) {
            rects.push({ id: 'hint', x: right - 118, y: 5, w: 118, h: HUD_H - 10 });
            right -= 126;
        }
        rects.push({ id: 'bag', x: right - 92, y: 5, w: 92, h: HUD_H - 10 });
        return rects;
    };

    Scene_Map.prototype.escButtonAt = function(x, y) {
        if (!EscapeManager.isActive() || EscapeManager._phase !== 'play') return null;
        var list = this.escButtonRects();
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.id;
        }
        return null;
    };

    var _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if (EscapeManager.isActive() && TouchInput.isTriggered() && TouchInput.y < HUD_H) {
            var b = this.escButtonAt(TouchInput.x, TouchInput.y);
            if (b === 'bag') EscapeManager.openBag();
            if (b === 'hint' && EscapeManager.canInteract()) EscapeManager.onHint();
            this._touchCount = 0;
            return;
        }
        _Scene_Map_processMapTouch.call(this);
    };

    // --- 상단 표시줄 ---------------------------------------------------------
    Scene_Map.prototype.escRefreshHud = function() {
        if (!this._escHud) return;
        var M = EscapeManager;
        var bmp = this._escHud.bitmap;
        bmp.clear();
        if (M._phase === 'error') return;
        var ctx = ctxOf(bmp);
        var g = ctx.createLinearGradient(0, 0, 0, HUD_H);
        g.addColorStop(0, 'rgba(10,8,6,0.82)');
        g.addColorStop(1, 'rgba(10,8,6,0.45)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SW(), HUD_H);
        setDirty(bmp);
        var room = M.currentRoom();
        bmp.fontSize = 20;
        bmp.textColor = '#ffe9b0';
        bmp.drawText(room ? (room.name || room.id) : '', 14, 0, 330, HUD_H, 'left');
        if (M._data.timeLimit && M._phase !== 'intro' && M._phase !== 'new') {
            var sec = M._timeLeft;
            bmp.textColor = sec <= 60 ? '#ff7a6a' : '#ffffff';
            bmp.fontSize = 22;
            bmp.drawText('⏱ ' + formatTime(sec), SW() / 2 - 60, 0, 120, HUD_H, 'center');
        }
        if (M._phase === 'play') {
            var self = this;
            this.escButtonRects().forEach(function(r) {
                var label = r.id === 'bag' ? '가방 (' + M._items.length + ')' : '힌트 ' + M._hintsLeft + '/' + M._data.hints;
                var fill = r.id === 'hint' ? (M._hintsLeft > 0 ? 'rgba(196,140,52,0.95)' : 'rgba(90,90,90,0.85)') : 'rgba(70,96,120,0.95)';
                roundRect(bmp, r.x, r.y, r.w, r.h, 8, fill, 'rgba(255,255,255,0.45)', 1);
                bmp.fontSize = 18;
                bmp.textColor = '#ffffff';
                bmp.drawText(label, r.x, r.y, r.w, r.h, 'center');
            });
            self = null;
        }
    };

    // --- 바라보는 물건 이름표 --------------------------------------------------
    Scene_Map.prototype.escFacingEvent = function() {
        var p = $gamePlayer;
        var x = $gameMap.roundXWithDirection(p.x, p.direction());
        var y = $gameMap.roundYWithDirection(p.y, p.direction());
        var list = $gameMap.eventsXy(x, y);
        for (var i = 0; i < list.length; i++) {
            var h = EscapeManager.hotspotForEvent(list[i]);
            if (h && EscapeManager.checkCond(h.when)) return { event: list[i], hotspot: h };
        }
        return null;
    };

    Scene_Map.prototype.escUpdateTip = function() {
        var f = null;
        if (EscapeManager.canInteract() && !$gamePlayer.isMoving()) f = this.escFacingEvent();
        var label = f ? (f.hotspot.label || f.hotspot.id) : '';
        if (label !== this._escTipText) {
            this._escTipText = label;
            var bmp = this._escTip.bitmap;
            bmp.clear();
            if (label) {
                bmp.fontSize = 18;
                var text = label + '  [조사]';
                var w = Math.min(296, bmp.measureTextWidth(text) + 24);
                roundRect(bmp, 2, 2, w, 28, 14, 'rgba(20,14,8,0.85)', 'rgba(255,224,160,0.85)', 1);
                bmp.textColor = '#ffe9b0';
                bmp.drawText(text, 14, 2, w - 24, 28, 'left');
                this._escTipW = w;
            }
        }
        this._escTip.visible = !!label;
        if (f) {
            var ex = f.event.screenX();
            var ey = f.event.screenY() - 64;
            this._escTip.x = Math.max(4, Math.min(SW() - this._escTipW - 4, ex - this._escTipW / 2));
            this._escTip.y = Math.max(HUD_H + 2, ey);
        }
    };

    // =========================================================================
    // 효과 (FX)
    // =========================================================================
    Scene_Map.prototype.escTileCenter = function(x, y) {
        var tw = $gameMap.tileWidth();
        var th = $gameMap.tileHeight();
        return { x: $gameMap.adjustX(x) * tw + tw / 2, y: $gameMap.adjustY(y) * th + th / 2 };
    };

    Scene_Map.prototype.escHotspotEvents = function(id) {
        return $gameMap.events().filter(function(ev) { return String(ev.event().name).trim() === id; });
    };

    Scene_Map.prototype.escHotspotCenter = function(id) {
        var list = this.escHotspotEvents(id);
        if (list.length === 0) return null;
        var sx = 0, sy = 0, self = this;
        list.forEach(function(ev) {
            var c = self.escTileCenter(ev.x, ev.y);
            sx += c.x; sy += c.y;
        });
        return { x: sx / list.length, y: sy / list.length, n: list.length };
    };

    Scene_Map.prototype.escPlayerPos = function() {
        return { x: $gamePlayer.screenX(), y: $gamePlayer.screenY() - 24 };
    };

    Scene_Map.prototype.escSpawn = function(o) {
        var sp = new Sprite(o.bitmap);
        sp.anchor.x = 0.5;
        sp.anchor.y = 0.5;
        sp.x = o.x;
        sp.y = o.y;
        sp.blendMode = o.blend === false ? 0 : 1;
        sp.scale.x = sp.scale.y = o.scale || 1;
        this._escFx.addChild(sp);
        this._escParticles.push({ sp: sp, vx: o.vx || 0, vy: o.vy || 0, life: o.life || 40, max: o.life || 40,
            ds: o.ds || 0, g: o.g || 0, tx: o.tx, ty: o.ty, spin: o.spin || 0, alpha: o.alpha || 255 });
        return sp;
    };

    Scene_Map.prototype.escBurst = function(x, y, n, rgb, speed) {
        for (var i = 0; i < n; i++) {
            var a = Math.random() * Math.PI * 2;
            var v = (speed || 3) * (0.4 + Math.random());
            this.escSpawn({ bitmap: fxSpark(rgb || '255,220,120'), x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1,
                life: 30 + Math.floor(Math.random() * 25), ds: -0.012, scale: 0.6 + Math.random() * 0.8, g: 0.04, spin: 0.1 });
        }
    };

    Scene_Map.prototype.escFxDoor = function(target) {
        var c = this.escHotspotCenter(target);
        if (!c) c = this.escPlayerPos();
        if (!playSafeSe(SE_DOOR, 90, 100)) SoundManager.playOk();
        $gameScreen.startFlash([255, 240, 200, 150], 24);
        var ring = this.escSpawn({ bitmap: fxGlow(160, '255,236,170'), x: c.x, y: c.y, life: 45, ds: 0.05, scale: 0.4 });
        ring.opacity = 255;
        this.escBurst(c.x, c.y, 34, '255,226,140', 4);
        this._escOpenKey = null;
    };

    Scene_Map.prototype.escSolveFx = function() {
        var p = this.escPlayerPos();
        for (var i = 0; i < 14; i++) {
            this.escSpawn({ bitmap: fxSpark('255,236,150'), x: p.x + (Math.random() - 0.5) * 50, y: p.y + 10 + Math.random() * 20,
                vx: (Math.random() - 0.5) * 0.6, vy: -1.2 - Math.random() * 1.4, life: 50 + Math.floor(Math.random() * 20),
                scale: 0.5 + Math.random() * 0.6, ds: -0.006, spin: 0.08 });
        }
        this.escSpawn({ bitmap: fxGlow(120, '255,240,180'), x: p.x, y: p.y, life: 40, ds: 0.03, scale: 0.5 });
    };

    Scene_Map.prototype.escSparkleAt = function(target) {
        var c = target ? this.escHotspotCenter(target) : null;
        if (!c) c = this.escPlayerPos();
        this.escBurst(c.x, c.y, 20, '200,230,255', 2.5);
    };

    Scene_Map.prototype.escItemPopup = function(id) {
        var info = (EscapeManager._data.items || {})[id] || { name: id };
        var p = this.escPlayerPos();
        if (info.image) {
            var bmp = ImageManager.loadPicture(info.image);
            var sp = this.escSpawn({ bitmap: bmp, x: p.x, y: p.y - 20, vy: -0.7, life: 80, scale: 0.55, blend: false });
            sp.blendMode = 0;
        }
        this.escSpawn({ bitmap: fxGlow(100, '255,244,190'), x: p.x, y: p.y - 30, life: 50, ds: 0.02, scale: 0.6 });
        this.escBurst(p.x, p.y - 30, 12, '255,236,150', 2);
        var b = this._escToast.bitmap;
        b.clear();
        roundRect(b, 2, 2, 356, 36, 18, 'rgba(30,22,10,0.88)', 'rgba(255,214,120,0.95)', 2);
        b.fontSize = 20;
        b.textColor = '#ffe9b0';
        b.drawText('✦ ' + info.name + ' 획득!', 0, 2, 360, 36, 'center');
        this._escToastT = 110;
    };

    Scene_Map.prototype.escTitleCard = function(text) {
        var parts = String(text).split('·');
        var top = parts.length > 1 ? parts[0].trim() : '';
        var main = parts.length > 1 ? parts.slice(1).join('·').trim() : String(text);
        var b = this._escCard.bitmap;
        b.clear();
        var ctx = ctxOf(b);
        var g = ctx.createLinearGradient(0, 0, SW(), 0);
        g.addColorStop(0, 'rgba(10,8,6,0)');
        g.addColorStop(0.2, 'rgba(10,8,6,0.78)');
        g.addColorStop(0.8, 'rgba(10,8,6,0.78)');
        g.addColorStop(1, 'rgba(10,8,6,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 10, SW(), 110);
        setDirty(b);
        b.fillRect(SW() * 0.2, 12, SW() * 0.6, 2, 'rgba(255,214,120,0.85)');
        b.fillRect(SW() * 0.2, 116, SW() * 0.6, 2, 'rgba(255,214,120,0.85)');
        if (top) {
            b.fontSize = 22;
            b.textColor = '#ffd27a';
            b.drawText(top, 0, 18, SW(), 34, 'center');
        }
        b.fontSize = 38;
        b.textColor = '#ffffff';
        b.drawText(main, 0, top ? 54 : 36, SW(), 54, 'center');
        this._escCardT = 170;
    };

    Scene_Map.prototype.escRefreshOpen = function() {
        var room = EscapeManager.currentRoom();
        var list = room ? toArray(room.hotspots).filter(function(h) {
            return h.open && EscapeManager.checkCond(h.open);
        }) : [];
        var key = list.map(function(h) { return h.id; }).join(',');
        if (key === this._escOpenKey) return;
        this._escOpenKey = key;
        var self = this;
        this._escOpenSprites.forEach(function(o) { self._escFx.removeChild(o.sp); });
        this._escOpenSprites = [];
        list.forEach(function(h) {
            var style = h.openStyle || 'door';
            if (style === 'glow') {
                var c = self.escHotspotCenter(h.id);
                if (!c) return;
                var sp = new Sprite(fxGlow(256, '255,236,170'));
                sp.anchor.x = sp.anchor.y = 0.5;
                sp.blendMode = 1;
                self._escFx.addChildAt(sp, 0);
                self._escOpenSprites.push({ sp: sp, id: h.id, style: style, base: 0.7 + c.n * 0.08 });
                var rays = new Sprite(fxRays(256));
                rays.anchor.x = rays.anchor.y = 0.5;
                rays.blendMode = 1;
                self._escFx.addChildAt(rays, 0);
                self._escOpenSprites.push({ sp: rays, id: h.id, style: 'rays', base: 0.7 + c.n * 0.08 });
            } else {
                self.escHotspotEvents(h.id).forEach(function(ev) {
                    var sp = new Sprite(fxDoorway());
                    sp.anchor.x = sp.anchor.y = 0.5;
                    sp.blendMode = 1;
                    self._escFx.addChildAt(sp, 0);
                    self._escOpenSprites.push({ sp: sp, ev: ev, style: 'door' });
                });
            }
        });
    };

    Scene_Map.prototype.escUpdateFx = function() {
        var t = Graphics.frameCount;
        var self = this;
        // 열린 문 / 빛나는 물건
        this.escRefreshOpen();
        this._escOpenSprites.forEach(function(o) {
            if (o.style === 'door') {
                var c = self.escTileCenter(o.ev.x, o.ev.y);
                o.sp.x = c.x;
                o.sp.y = c.y;
                o.sp.opacity = 170 + Math.sin(t / 18) * 50;
            } else {
                var cc = self.escHotspotCenter(o.id);
                if (!cc) return;
                o.sp.x = cc.x;
                o.sp.y = cc.y;
                if (o.style === 'rays') {
                    o.sp.rotation = t / 160;
                    o.sp.scale.x = o.sp.scale.y = o.base;
                    o.sp.opacity = 80 + Math.sin(t / 25) * 30;
                } else {
                    var s = o.base + Math.sin(t / 22) * 0.08;
                    o.sp.scale.x = o.sp.scale.y = s;
                    o.sp.opacity = 130 + Math.sin(t / 22) * 40;
                }
            }
        });
        // 파티클
        for (var i = this._escParticles.length - 1; i >= 0; i--) {
            var q = this._escParticles[i];
            q.life--;
            if (q.tx !== undefined) {
                q.sp.x += (q.tx - q.sp.x) * 0.08;
                q.sp.y += (q.ty - q.sp.y) * 0.08;
            } else {
                q.vy += q.g;
                q.sp.x += q.vx;
                q.sp.y += q.vy;
            }
            q.sp.rotation += q.spin;
            q.sp.scale.x = q.sp.scale.y = Math.max(0.05, q.sp.scale.x + q.ds);
            q.sp.opacity = q.alpha * Math.min(1, q.life / (q.max * 0.5));
            if (q.life <= 0) {
                this._escFx.removeChild(q.sp);
                this._escParticles.splice(i, 1);
            }
        }
        // 시대 카드
        if (this._escCardT > 0) {
            this._escCardT--;
            var e = 170 - this._escCardT;
            this._escCard.opacity = e < 20 ? e / 20 * 255 : (this._escCardT < 30 ? this._escCardT / 30 * 255 : 255);
        } else {
            this._escCard.opacity = 0;
        }
        // 획득 알림
        if (this._escToastT > 0) {
            this._escToastT--;
            var f = 110 - this._escToastT;
            this._escToast.opacity = f < 10 ? f / 10 * 255 : (this._escToastT < 20 ? this._escToastT / 20 * 255 : 255);
        } else {
            this._escToast.opacity = 0;
        }
        if (this._escCine) this.escUpdateGate();
    };

    // --- 시간의 문 연출 ---------------------------------------------------------
    Scene_Map.prototype.escStartGate = function(s, done) {
        var self = this;
        var items = EscapeManager._data.items || {};
        var target = s.target || 'gate';
        var c = this.escHotspotCenter(target) || { x: SW() / 2, y: 140, n: 1 };
        var cine = { t: 0, c: c, done: done, icons: [] };
        toArray(s.items).forEach(function(id) {
            var info = items[id];
            if (!info || !info.image) return;
            var sp = new Sprite(ImageManager.loadPicture(info.image));
            sp.anchor.x = sp.anchor.y = 0.5;
            sp.visible = false;
            self._escFx.addChild(sp);
            cine.icons.push(sp);
        });
        cine.glow = new Sprite(fxGlow(256, '255,240,190'));
        cine.glow.anchor.x = cine.glow.anchor.y = 0.5;
        cine.glow.blendMode = 1;
        cine.glow.x = c.x;
        cine.glow.y = c.y;
        cine.glow.opacity = 0;
        cine.rays = new Sprite(fxRays(320));
        cine.rays.anchor.x = cine.rays.anchor.y = 0.5;
        cine.rays.blendMode = 1;
        cine.rays.x = c.x;
        cine.rays.y = c.y;
        cine.rays.opacity = 0;
        this._escFx.addChild(cine.rays);
        this._escFx.addChild(cine.glow);
        this._escCine = cine;
        $gameTemp.clearDestination();
    };

    Scene_Map.prototype.escUpdateGate = function() {
        var cine = this._escCine;
        var t = ++cine.t;
        var c = cine.c;
        var p = this.escPlayerPos();
        var self = this;
        // 1) 세 보물이 차례로 문으로 날아감
        cine.icons.forEach(function(sp, i) {
            var start = 10 + i * 24;
            if (t < start) return;
            var k = (t - start) / 40;
            if (k <= 1) {
                sp.visible = true;
                sp.x = p.x + (c.x - p.x) * k;
                sp.y = p.y - 20 + (c.y - p.y + 20) * k - Math.sin(k * Math.PI) * 70;
                sp.scale.x = sp.scale.y = 0.55 - k * 0.3;
                sp.rotation = Math.sin(k * 6) * 0.2;
            } else if (sp.visible) {
                sp.visible = false;
                self.escBurst(c.x, c.y, 18, '255,230,150', 3);
                if (!playSafeSe(SE_SOLVE, 90, 110 + i * 10)) SoundManager.playOk();
                cine.glow.opacity = Math.min(255, cine.glow.opacity + 70);
            }
        });
        // 2) 문이 커지며 빛을 빨아들임
        if (t === 92) {
            if (!playSafeSe(SE_GATE, 90, 100)) SoundManager.playRecovery();
            $gameScreen.startShake(3, 6, 110);
        }
        if (t > 92 && t <= 200) {
            var k2 = (t - 92) / 108;
            cine.glow.scale.x = cine.glow.scale.y = 1 + k2 * 2.2 + Math.sin(t / 6) * 0.06;
            cine.glow.opacity = 200 + k2 * 55;
            cine.rays.opacity = Math.min(230, k2 * 400);
            cine.rays.scale.x = cine.rays.scale.y = 0.8 + k2 * 1.6;
            if (t % 2 === 0) {
                var a = Math.random() * Math.PI * 2;
                var r = 260 + Math.random() * 120;
                this.escSpawn({ bitmap: fxSpark('255,236,170'), x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r,
                    tx: c.x, ty: c.y, life: 36, scale: 0.5 + Math.random() * 0.6, ds: -0.01, spin: 0.15 });
            }
        }
        cine.rays.rotation += 0.01 + (t > 92 ? (t - 92) / 3000 : 0);
        // 3) 주인공이 문으로 걸어 들어감
        if (t === 170) {
            $gamePlayer.setThrough(true);
            $gamePlayer.setDirection(8);
        }
        if (t >= 170 && t < 230 && !$gamePlayer.isMoving() && (t - 170) % 16 === 0) {
            $gamePlayer.moveStraight(8);
        }
        if (t >= 170 && t <= 230) {
            $gamePlayer.setOpacity(Math.max(0, 255 - (t - 170) * 4.5));
        }
        // 4) 하얗게
        if (t >= 190 && t <= 250) {
            this._escWhite.opacity = Math.min(255, (t - 190) / 60 * 255);
        }
        if (t === 262) {
            this._escFx.removeChild(cine.glow);
            this._escFx.removeChild(cine.rays);
            cine.icons.forEach(function(sp) { self._escFx.removeChild(sp); });
            $gamePlayer.setThrough(false);
            this._escCine = null;
            if (cine.done) cine.done();
        }
    };

    // --- 확대 그림 ---------------------------------------------------------------
    Scene_Map.prototype.escShowCloseup = function(name, maxScale) {
        var bmp = ImageManager.loadPicture(name);
        var sprite = this._escCloseup;
        var self = this;
        this._escCloseupName = name;
        sprite.bitmap = bmp;
        sprite.visible = false;
        this._escDim.visible = true;
        bmp.addLoadListener(function() {
            var maxW = SW() - 60;
            var maxH = self._escMsg.y - HUD_H - 60;
            var scale = Math.min(maxScale || 1, maxW / bmp.width, maxH / bmp.height);
            sprite.scale.x = scale;
            sprite.scale.y = scale;
            sprite.y = HUD_H + 10 + maxH / 2;
            sprite.visible = self._escCloseupName === name;
        });
    };

    Scene_Map.prototype.escCloseupVisible = function() {
        return !!this._escCloseupName;
    };

    // 확대 그림을 HUD 아래 ~ bottom 사이에 맞춰 다시 배치
    Scene_Map.prototype.escFitCloseup = function(bottom) {
        var sprite = this._escCloseup;
        var bmp = sprite.bitmap;
        if (!bmp) return;
        var fit = function() {
            var maxW = SW() - 40;
            var maxH = bottom - HUD_H - 8;
            var scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
            sprite.scale.x = scale;
            sprite.scale.y = scale;
            sprite.y = HUD_H + 4 + maxH / 2;
        };
        if (bmp.isReady()) fit(); else bmp.addLoadListener(fit);
    };

    Scene_Map.prototype.escHideCloseup = function() {
        if (!this._escCloseup) return;
        this._escCloseupName = '';
        this._escCloseup.visible = false;
        this._escDim.visible = false;
    };

    Scene_Map.prototype.escCloseAll = function() {
        [this._escChoice, this._escNumpad, this._escBag, this._escDial].forEach(function(w) {
            if (w) {
                w.deactivate();
                w.close();
            }
        });
        if (this._escMsg) this._escMsg.dismiss();
    };

    // --- 오류 화면 ---------------------------------------------------------------
    Scene_Map.prototype.escShowError = function(errors) {
        var text = '[데이터 파일 확인 필요]\n' + errors.slice(0, 12).join('\n');
        if (errors.length > 12) text += '\n... 외 ' + (errors.length - 12) + '개';
        console.error('EscapeRoom 데이터 오류:\n' + errors.join('\n'));
        var bmp = new Bitmap(SW(), SH());
        bmp.fillAll('#1a1010');
        bmp.fontSize = 20;
        var lines = wrapText(bmp, text, SW() - 60);
        for (var i = 0; i < lines.length && i < 22; i++) {
            bmp.textColor = i === 0 ? '#ffb070' : '#ffffff';
            bmp.drawText(lines[i], 30, 30 + i * 26, SW() - 60, 26, 'left');
        }
        this._escError.bitmap = bmp;
        this._escHud.bitmap.clear();
    };

    // --- 제작 도우미 -------------------------------------------------------------
    Scene_Map.prototype.escUpdateDebug = function() {
        var key = $gameMap.displayX() + ',' + $gameMap.displayY() + ',' + $gamePlayer.x + ',' + $gamePlayer.y;
        if (key === this._escDebugText) return;
        this._escDebugText = key;
        var bmp = this._escDebug.bitmap;
        bmp.clear();
        var tw = $gameMap.tileWidth();
        var th = $gameMap.tileHeight();
        var ox = $gameMap.displayX();
        var oy = $gameMap.displayY();
        for (var y = 0; y < $gameMap.height(); y++) {
            for (var x = 0; x < $gameMap.width(); x++) {
                var sx = (x - ox) * tw;
                var sy = (y - oy) * th;
                if (sx < -tw || sy < -th || sx > SW() || sy > SH()) continue;
                if ($gameMap.regionId(x, y) === WALL_REGION) {
                    bmp.fillRect(sx, sy, tw, th, 'rgba(255,40,40,0.28)');
                }
            }
        }
        $gameMap.events().forEach(function(ev) {
            var h = EscapeManager.hotspotForEvent(ev);
            var sx = (ev.x - ox) * tw;
            var sy = (ev.y - oy) * th;
            bmp.fillRect(sx + 2, sy + 2, tw - 4, th - 4, h ? 'rgba(255,230,0,0.35)' : 'rgba(120,200,255,0.3)');
            bmp.fontSize = 12;
            bmp.textColor = h ? '#fff27a' : '#bfe6ff';
            bmp.drawText(String(ev.event().name), sx, sy + th - 16, tw, 14, 'center');
        });
        bmp.fillRect(SW() - 210, SH() - 34, 206, 30, 'rgba(0,0,0,0.7)');
        bmp.fontSize = 16;
        bmp.textColor = '#7fffd4';
        bmp.drawText('맵 ' + $gameMap.mapId() + '번  x: ' + $gamePlayer.x + '  y: ' + $gamePlayer.y, SW() - 204, SH() - 34, 196, 30, 'left');
        var missing = EscapeManager._missing || [];
        if (missing.length > 0) {
            bmp.fillRect(4, SH() - 34, SW() - 220, 30, 'rgba(120,0,0,0.75)');
            bmp.textColor = '#ffffff';
            bmp.drawText('이벤트가 없는 조사 지점: ' + missing.join(', '), 10, SH() - 34, SW() - 232, 30, 'left');
        }
    };
    //=========================================================================
    // 휴대폰·태블릿을 세로로 들었을 때 "가로로 돌려 주세요" 안내
    //=========================================================================
    (function() {
        var box = null, dismissed = false;
        function isTouchDevice() {
            return Utils.isMobileDevice() || ('ontouchstart' in window) || (navigator.maxTouchPoints > 1);
        }
        function block(e) { e.stopPropagation(); }
        function check() {
            var show = !dismissed && isTouchDevice() && window.innerHeight > window.innerWidth * 1.05;
            if (!box) {
                if (!show) return;
                box = document.createElement('div');
                box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:200;display:flex;' +
                    'flex-direction:column;align-items:center;justify-content:center;background:rgba(12,10,8,0.92);' +
                    'color:#ffe9b0;font-family:GameFont,sans-serif;text-align:center;';
                box.innerHTML = '<div style="font-size:20vmin;line-height:1">&#x1F4F1;&#x21BB;</div>' +
                    '<div style="font-size:7vmin;margin-top:4vmin">화면을 <b>가로</b>로 돌려 주세요</div>' +
                    '<div style="font-size:4.2vmin;margin-top:2vmin;color:#cdbf9f;line-height:1.5">가로로 들면 게임 화면이 훨씬 크게 보여요.<br>' +
                    '(화면 자동 회전이 꺼져 있다면 켜 주세요)</div>' +
                    '<div id="escRotateSkip" style="margin-top:7vmin;padding:2.5vmin 6vmin;border:1px solid #8a7a5a;' +
                    'border-radius:2vmin;font-size:4.5vmin;color:#ffffff">그냥 세로로 할래요</div>';
                ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'pointerdown', 'wheel'].forEach(function(n) {
                    box.addEventListener(n, block);
                });
                var skip = box.querySelector('#escRotateSkip');
                var onSkip = function(e) { e.preventDefault(); e.stopPropagation(); dismissed = true; check(); };
                skip.addEventListener('touchend', onSkip);
                skip.addEventListener('click', onSkip);
                document.body.appendChild(box);
            }
            box.style.setProperty('z-index', '1000', 'important');
            box.style.display = show ? 'flex' : 'none';
        }
        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', function() { setTimeout(check, 300); });
        window.addEventListener('load', check);
        setTimeout(check, 0);
    })();
})();
