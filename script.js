// 動画の縦横比設定（グローバル変数）
const VIDEO_ASPECT_RATIO = 16 / 9; // 一般的な動画のアスペクト比（必要に応じて調整）
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;

// テキスト表示の切り替え時間（秒）
const TIME_HAI_END = 2.4; // 「はい、[QUERY]」の表示終了時間
const TIME_SOUSOUSOUSOU_END = 3.9; // 「そうそうそうそう」の表示終了時間（この時点でAPI結果をチェック）
const TIME_KI_END = 5.5; // kiの表示終了時間
const TIME_SHOU_END = 7.1; // shouの表示終了時間
const TIME_KETSU_END = 8.6; // ketsuの表示終了時間
const TIME_TTE_END = 9.3; // 「って…」の表示終了時間

// DOM要素の取得
const questionForm = document.getElementById('question-form');
const questionInput = document.getElementById('question-input');
const questionArea = document.getElementById('question-area');
const answerArea = document.getElementById('answer-area');
const loadingArea = document.getElementById('loading-area');
const answerText = document.getElementById('answer-text');
const newQuestionBtn = document.getElementById('new-question-btn');
const loadingVideo = document.getElementById('loading-video');
const displayVideo = document.getElementById('display-video');
const answerVideo = document.getElementById('answer-video');

// API設定
const API_URL_BASE = 'https://iikiruotokoapi-1.onrender.com/';
// const API_URL_BASE = 'http://localhost:10000/';
const API_URL = API_URL_BASE + 'nori_tsukkomi';

// 動画サイズを動的に計算する関数
function calculateVideoSize() {
    const containerHeight = window.innerHeight * 0.95; // 95vh
    const containerWidth = window.innerWidth * 0.9; // 90% of viewport width
    
    // スマホ（縦）の場合は横幅いっぱいにする
    const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    
    if (isMobilePortrait) {
        // スマホ（縦）の場合は横幅いっぱい、高さは画面に収まる範囲で最大に
        const videoWidth = window.innerWidth; // 100% of viewport width
        const calculatedHeight = videoWidth / VIDEO_ASPECT_RATIO;
        // 画面の高さを超えないようにする
        const videoHeight = Math.min(calculatedHeight, containerHeight);
        return { width: videoWidth, height: videoHeight };
    }
    
    // 縦横比を考慮して動画サイズを計算
    let videoWidth, videoHeight;
    
    if (containerHeight * VIDEO_ASPECT_RATIO <= containerWidth) {
        // 高さに合わせる
        videoHeight = containerHeight;
        videoWidth = containerHeight * VIDEO_ASPECT_RATIO;
    } else {
        // 幅に合わせる
        videoWidth = containerWidth;
        videoHeight = containerWidth / VIDEO_ASPECT_RATIO;
    }
    
    return { width: videoWidth, height: videoHeight };
}

// 動画サイズを更新する関数
function updateVideoSize() {
    const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const videos = document.querySelectorAll('.main-video');
    
    if (isMobilePortrait) {
        // スマホの場合はCSSで制御（JavaScriptでサイズを設定しない）
        videos.forEach(video => {
            video.style.width = '';
            video.style.height = '';
        });
    } else {
        // デスクトップの場合は動的にサイズを計算
        const { width, height } = calculateVideoSize();
        videos.forEach(video => {
            video.style.width = `${width}px`;
            video.style.height = `${height}px`;
        });
    }
    
    // 動画のサイズ設定後にテキストボックスの幅を調整（少し遅延を入れる）
    setTimeout(() => {
        const overlays = document.querySelectorAll('.overlay-form, .overlay-answer');
        const firstVideo = document.querySelector('.main-video');
        if (firstVideo) {
            const actualVideoWidth = firstVideo.offsetWidth || firstVideo.clientWidth;
            overlays.forEach(overlay => {
                if (!isMobilePortrait) {
                    // デスクトップの場合は実際の動画の幅を取得して50%に設定（最大500px）
                    const overlayWidth = Math.min(actualVideoWidth * 0.5, 500);
                    overlay.style.width = `${overlayWidth}px`;
                    overlay.style.maxWidth = `${overlayWidth}px`;
                } else {
                    // スマホの場合は動画の幅の98%に設定
                    const overlayWidth = actualVideoWidth * 0.98;
                    overlay.style.width = `${overlayWidth}px`;
                    overlay.style.maxWidth = `${overlayWidth}px`;
                }
            });
            
            // 回答エリアのテキストボックスのサイズを最初のtextareaと同じにする
            syncAnswerBoxSize();
        }
    }, 10);
}

// ウィンドウリサイズ時に動画サイズを更新
window.addEventListener('resize', updateVideoSize);

// フォーム送信処理
questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const question = questionInput.value.trim();
    if (!question) return;
    
    // 送信ボタンを無効化
    const submitBtn = questionForm.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '処理中...';
    
    try {
        // 質問エリアを非表示にする前に、サイズを保存
        const overlayForm = document.querySelector('.overlay-form');
        const questionInput = document.getElementById('question-input');
        let savedFormWidth = 0;
        let savedInputHeight = 0;
        
        if (overlayForm && questionInput) {
            savedFormWidth = overlayForm.offsetWidth;
            savedInputHeight = questionInput.offsetHeight;
        }
        
        // 質問エリアを非表示、回答エリアを表示
        questionArea.classList.add('hidden');
        answerArea.classList.remove('hidden');
        
        // 回答エリアに「はい、[QUERY]」を表示
        answerText.textContent = `はい、${question}`;
        answerText.style.fontSize = '36px';
        
        // 回答エリアのテキストボックスのサイズを最初のtextareaと同じにする
        // 少し遅延を入れてレイアウトが確定してから設定
        setTimeout(() => {
            const overlayAnswer = document.querySelector('.overlay-answer');
            const answerText = document.getElementById('answer-text');
            
            if (overlayAnswer) {
                if (savedFormWidth > 0) {
                    overlayAnswer.style.width = `${savedFormWidth}px`;
                    overlayAnswer.style.maxWidth = `${savedFormWidth}px`;
                    overlayAnswer.style.minWidth = `${savedFormWidth}px`;
                } else {
                    // フォールバック: 表示されている状態でサイズを取得
                    syncAnswerBoxSize();
                }
            }
            
            if (answerText && savedInputHeight > 0) {
                answerText.style.minHeight = `${savedInputHeight}px`;
                answerText.style.height = `${savedInputHeight}px`;
            }
        }, 10);
        
        // APIリクエストを開始（Promiseを保存）
        let apiPromise = sendToAPI(question).then(answerData => {
            return { success: true, answerData: answerData };
        }).catch(error => {
            console.error('エラーが発生しました:', error);
            return { success: false, error: '申し訳ございません。エラーが発生しました。もう一度お試しください。' };
        });
        
        // API結果の状態を管理
        let apiResult = null;
        let hasReached27Seconds = false;
        
        // 動画の再生時間に応じてテキストを更新する関数
        const updateAnswerTextByTime = (currentTime, answerData, question) => {
            if (currentTime < TIME_SOUSOUSOUSOU_END) {
                if (currentTime < TIME_HAI_END) {
                    answerText.textContent = `はい、${question}`;
                    answerText.style.fontSize = '36px';
                } else {
                    answerText.textContent = 'そうそうそうそう';
                    answerText.style.fontSize = '36px';
                }
            } else if (!answerData) {
                answerText.textContent = 'そうそうそうそう';
                answerText.style.fontSize = '36px';
            } else if (answerData && currentTime < TIME_KI_END) {
                answerText.textContent = answerData.ki;
                answerText.style.fontSize = '36px';
            } else if (answerData && currentTime < TIME_SHOU_END) {
                answerText.textContent = answerData.shou;
                answerText.style.fontSize = '36px';
            } else if (answerData && currentTime < TIME_KETSU_END) {
                answerText.textContent = answerData.ketsu;
                answerText.style.fontSize = '36px';
            } else if (answerData && currentTime < TIME_TTE_END) {
                answerText.textContent = 'って…';
                answerText.style.fontSize = '36px';
            } else if (answerData) {
                answerText.textContent = 'そ！';
                answerText.style.fontSize = '70px';
            } else {
                answerText.textContent = 'そうそうそうそう';
                answerText.style.fontSize = '36px';
            }
        };
        
        // API結果を取得（非同期で実行）
        apiPromise.then(result => {
            apiResult = result;
            
            // APIチェック時間を過ぎていれば、すぐに動画を再開
            if (hasReached27Seconds) {
                if (result.success) {
                    // 現在の時刻に応じてテキストを更新
                    updateAnswerTextByTime(answerVideo.currentTime, result.answerData, question);
                } else {
                    displayError(result.error);
                }
                // 動画が停止している場合は再開して最後まで再生
                if (answerVideo.paused) {
                    answerVideo.play().catch(error => {
                        console.error('動画の再開に失敗しました:', error);
                    });
                }
            }
        });
        
        // 動画を最初から再生開始
        answerVideo.currentTime = 0;
        // スマホでの再生を確実にするため、Promiseで処理
        answerVideo.play().catch(error => {
            console.error('動画の再生に失敗しました:', error);
            // 再生が拒否された場合、ユーザーインタラクション後に再試行
            const retryPlay = () => {
                answerVideo.play().catch(err => console.error('再試行も失敗:', err));
            };
            // タッチイベントで再試行
            document.addEventListener('touchstart', retryPlay, { once: true });
            document.addEventListener('click', retryPlay, { once: true });
        });
        
        // 動画の再生時間を監視してテキストを更新
        const checkTimeUpdate = () => {
            const currentTime = answerVideo.currentTime;
            
            // 「そうそうそうそう」の終了時点でAPI結果をチェック
            if (currentTime >= TIME_SOUSOUSOUSOU_END && !hasReached27Seconds) {
                hasReached27Seconds = true;
                
                if (apiResult) {
                    // API結果が既に返ってきている場合
                    if (apiResult.success) {
                        updateAnswerTextByTime(currentTime, apiResult.answerData, question);
                    } else {
                        displayError(apiResult.error);
                    }
                    // 動画は続行（最後まで再生）
                } else {
                    // API結果がまだ返ってきていない場合、動画を停止して待機
                    answerVideo.pause();
                }
            }
            
            // 時間に応じてテキストを更新（API結果がなくても「はい、[QUERY]」や「そうそうそうそう」は表示可能）
            if (apiResult && apiResult.success) {
                updateAnswerTextByTime(currentTime, apiResult.answerData, question);
            } else {
                // API結果がまだない場合でも、TIME_SOUSOUSOUSOU_ENDまでは「はい、[QUERY]」や「そうそうそうそう」を表示
                updateAnswerTextByTime(currentTime, null, question);
            }
        };
        
        answerVideo.addEventListener('timeupdate', checkTimeUpdate);
        
        // 最初はボタンを非表示（レイアウトは維持）
        newQuestionBtn.style.visibility = 'hidden';
        newQuestionBtn.style.opacity = '0';
        newQuestionBtn.style.pointerEvents = 'none';
        
        // 動画の最後で固定する処理
        answerVideo.addEventListener('ended', () => {
            // 動画の最後のフレームで固定
            answerVideo.pause();
            // 最後のフレームを確実に表示するため、durationの直前を設定
            if (answerVideo.duration) {
                answerVideo.currentTime = answerVideo.duration - 0.1;
            }
            // timeupdateイベントリスナーを削除
            answerVideo.removeEventListener('timeupdate', checkTimeUpdate);
            // ボタンを表示
            newQuestionBtn.style.visibility = 'visible';
            newQuestionBtn.style.opacity = '1';
            newQuestionBtn.style.pointerEvents = 'auto';
        }, { once: true });
        
    } catch (error) {
        console.error('エラーが発生しました:', error);
        displayError('申し訳ございません。エラーが発生しました。もう一度お試しください。');
    } finally {
        // 送信ボタンを再有効化
        submitBtn.disabled = false;
        submitBtn.textContent = 'ノリツッコミ';
    }
});

// APIにリクエスト送信
async function sendToAPI(question) {
    const requestBody = {
        message: question
    };
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.log(errorText);
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // JSON形式のレスポンスをパース
    if (data.ki && data.shou && data.ketsu) {
        // JSONオブジェクトとして返す
        return {
            ki: data.ki,
            shou: data.shou,
            ketsu: data.ketsu
        };
    } else {
        throw new Error('Invalid response format from API');
    }
}

// 回答を表示（この関数は現在使用されていませんが、互換性のため残しています）
function displayAnswer(answer) {
    let processedAnswer = answer;
    
    // 空文字列になった場合は元の文字列を使用
    if (processedAnswer.trim() === '') {
        processedAnswer = answer;
    }
    
    answerText.textContent = processedAnswer;
    
    // 回答エリアのテキストボックスのサイズを維持（既に設定されているサイズを使用）
    // サイズは送信時に設定されているので、ここでは再設定しない
}

// エラーを表示
function displayError(errorMessage) {
    answerText.textContent = errorMessage;
    answerText.style.fontSize = '36px';
    
    // 回答エリアのテキストボックスのサイズを維持（既に設定されているサイズを使用）
    // サイズは送信時に設定されているので、ここでは再設定しない
}

// 回答エリアのテキストボックスのサイズを最初のtextareaと同じにする
function syncAnswerBoxSize() {
    const questionInput = document.getElementById('question-input');
    const overlayAnswer = document.querySelector('.overlay-answer');
    const overlayForm = document.querySelector('.overlay-form');
    
    if (questionInput && overlayAnswer && overlayForm) {
        // 最初のtextareaのサイズを取得
        const inputWidth = questionInput.offsetWidth;
        const inputHeight = questionInput.offsetHeight;
        
        // 回答エリアのoverlayのサイズを最初のoverlayと同じにする
        const formWidth = overlayForm.offsetWidth;
        const formHeight = overlayForm.offsetHeight;
        
        overlayAnswer.style.width = `${formWidth}px`;
        overlayAnswer.style.maxWidth = `${formWidth}px`;
        overlayAnswer.style.minWidth = `${formWidth}px`;
        
        // answer-textの高さも調整（最初のtextareaと同じ高さ）
        const answerText = document.getElementById('answer-text');
        if (answerText) {
            answerText.style.minHeight = `${inputHeight}px`;
            answerText.style.height = `${inputHeight}px`;
        }
    }
}

// 新しい質問ボタンの処理
newQuestionBtn.addEventListener('click', () => {
    // ボタンを非表示にする（レイアウトは維持）
    newQuestionBtn.style.visibility = 'hidden';
    newQuestionBtn.style.opacity = '0';
    newQuestionBtn.style.pointerEvents = 'none';
    
    // 回答エリアを非表示、質問エリアを表示
    answerArea.classList.add('hidden');
    questionArea.classList.remove('hidden');
    
    // 回答エリアの動画をリセット
    if (answerVideo) {
        answerVideo.pause();
        answerVideo.currentTime = 0;
    }
    
    // 最初の動画を最初のフレームで固定
    if (displayVideo) {
        displayVideo.pause();
        displayVideo.currentTime = 0;
    }
    
    // フォームをリセット
    questionForm.reset();
    questionInput.focus();
});

// コールドスタート対策: APIを叩いてサーバーを起動状態に保つ
async function warmupAPI() {
    try {
        const response = await fetch(API_URL_BASE, {
            method: 'GET'
        });
    } catch (error) {
        console.log(error);
    }
}

// 動画の読み込みエラーハンドリング
function setupVideoErrorHandling(video, videoName) {
    video.addEventListener('error', (e) => {
        console.error(`${videoName}の読み込みエラー:`, e);
        const error = video.error;
        if (error) {
            console.error('エラーコード:', error.code);
            console.error('エラーメッセージ:', error.message);
        }
        // 動画のパスを再試行
        const currentSrc = video.src;
        video.src = '';
        video.load();
        setTimeout(() => {
            video.src = currentSrc;
            video.load();
        }, 100);
    });
    
    video.addEventListener('loadstart', () => {
        console.log(`${videoName}の読み込み開始`);
    });
    
    video.addEventListener('loadeddata', () => {
        console.log(`${videoName}のデータ読み込み完了`);
    });
    
    video.addEventListener('canplay', () => {
        console.log(`${videoName}の再生準備完了`);
    });
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    warmupAPI();
    
    // すべての動画要素にエラーハンドリングを設定
    if (displayVideo) {
        setupVideoErrorHandling(displayVideo, 'display-video');
        displayVideo.pause();
        displayVideo.currentTime = 0;
        // 動画のメタデータが読み込まれたら最初のフレームで固定
        displayVideo.addEventListener('loadedmetadata', () => {
            displayVideo.currentTime = 0;
            displayVideo.pause();
        });
        // 動画の読み込みを明示的に開始
        displayVideo.load();
    }
    
    if (answerVideo) {
        setupVideoErrorHandling(answerVideo, 'answer-video');
        // 動画の読み込みを明示的に開始
        answerVideo.load();
    }
    
    if (loadingVideo) {
        setupVideoErrorHandling(loadingVideo, 'loading-video');
        // 動画の読み込みを明示的に開始
        loadingVideo.load();
    }
    
    questionInput.focus();
    updateVideoSize(); // 動画サイズを初期化
    
    // コマンド + エンターで送信
    questionInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            questionForm.dispatchEvent(new Event('submit'));
        }
    });
});

