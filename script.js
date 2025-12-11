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
const contentArea = document.getElementById('content-area');
const answerText = document.getElementById('answer-text');
const newQuestionBtn = document.getElementById('new-question-btn');
const loadingVideo = document.getElementById('loading-video');
const displayImage = document.getElementById('display-image');
const answerVideo = document.getElementById('answer-video');
const overlay = document.getElementById('overlay');
const formContent = document.getElementById('form-content');
const answerContent = document.getElementById('answer-content');

// API設定
const API_URL_BASE = 'https://iikiruotokoapi-1.onrender.com/';
// const API_URL_BASE = 'http://localhost:10000/';
const API_URL = API_URL_BASE + 'nori_tsukkomi';

// overlayの固定width（一度設定したら変更しない）
let fixedOverlayWidth = null;

// 動画サイズを動的に計算する関数
function calculateVideoSize() {
    const containerHeight = window.innerHeight * 0.98; // 98vh
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

// 動画・画像サイズを更新する関数
function updateVideoSize() {
    const isMobilePortrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const mediaElements = document.querySelectorAll('.main-video');
    
    if (isMobilePortrait) {
        // スマホの場合はCSSで制御（JavaScriptでサイズを設定しない）
        mediaElements.forEach(element => {
            element.style.width = '';
            element.style.height = '';
        });
    } else {
        // デスクトップの場合は動的にサイズを計算
        const { width, height } = calculateVideoSize();
        mediaElements.forEach(element => {
            element.style.width = `${width}px`;
            element.style.height = `${height}px`;
        });
    }
    
    // 動画・画像のサイズ設定後にテキストボックスの幅と位置を調整（少し遅延を入れる）
    setTimeout(() => {
        const container = contentArea.querySelector('.video-container');
        if (!container || !overlay) return;
        
        // 現在表示されているメディア（画像または動画）を取得
        const currentMedia = displayImage.classList.contains('hidden') ? answerVideo : displayImage;
        
        if (!currentMedia) return;
        
        const actualMediaWidth = currentMedia.offsetWidth || currentMedia.clientWidth;
        const mediaRect = currentMedia.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // 幅の設定（固定widthが設定されている場合はそれを使用、そうでない場合は計算）
        let overlayWidth;
        if (fixedOverlayWidth !== null) {
            // 固定widthが設定されている場合はそれを使用
            overlayWidth = fixedOverlayWidth;
        } else {
            // 固定widthが設定されていない場合は計算
            if (!isMobilePortrait) {
                // デスクトップの場合は実際のメディアの幅を取得して50%に設定（最大500px）
                overlayWidth = Math.min(actualMediaWidth * 0.5, 500);
            } else {
                // スマホの場合はメディアの幅の98%に設定
                overlayWidth = actualMediaWidth * 0.98;
            }
            // 計算したwidthを固定widthとして保存
            fixedOverlayWidth = overlayWidth;
        }
        
        overlay.style.width = `${overlayWidth}px`;
        overlay.style.maxWidth = `${overlayWidth}px`;
        overlay.style.minWidth = `${overlayWidth}px`;
        
        // 動画の高さを基準に位置と高さを設定
        if (containerRect && mediaRect) {
            const mediaHeight = mediaRect.height;
            const mediaTop = mediaRect.top;
            const containerTop = containerRect.top;
            
            // 動画の上端からの相対位置を計算
            // テキストボックスの上端: 動画の上から66%
            // テキストボックスの下端: 動画の上から90%
            const overlayTopPercent = 66; // 66%
            const overlayBottomPercent = 90; // 90%
            
            // テキストボックスの高さ = 動画の高さ × (90% - 66%)
            const overlayHeight = mediaHeight * (overlayBottomPercent - overlayTopPercent) / 100;
            
            // コンテナ内でのテキストボックスの上端位置
            // = コンテナの上端から動画の上端までの距離 + 動画の上端から66%の位置
            const overlayTopInContainer = (mediaTop - containerTop) + (mediaHeight * overlayTopPercent / 100);
            
            // コンテナの下端からの距離 = コンテナの高さ - (上端位置 + 高さ)
            const distanceFromContainerBottom = containerRect.height - (overlayTopInContainer + overlayHeight);
            
            overlay.style.bottom = `${distanceFromContainerBottom}px`;
            overlay.style.height = `${overlayHeight}px`;
            overlay.style.maxHeight = `${overlayHeight}px`;
            overlay.style.minHeight = `${overlayHeight}px`;
            
            // 内部要素の高さを調整
            // 白地の高さから、padding、gap、ボタンの高さを引いた値がテキストボックスの高さ
            const overlayPadding = 15; // padding: 15px（上下）
            const gap = 5; // gap: 5px（テキストボックスとボタンの間）
            
            // ボタンの高さを取得
            const submitBtn = overlay.querySelector('.submit-btn');
            const newQuestionBtn = overlay.querySelector('.new-question-btn');
            const button = submitBtn || newQuestionBtn;
            
            let buttonHeight = 36; // デフォルト36px（padding: 6px 20pxの場合）
            if (button) {
                // ボタンが非表示の場合でも高さを取得できるようにする
                const originalVisibility = button.style.visibility;
                const originalOpacity = button.style.opacity;
                button.style.visibility = 'visible';
                button.style.opacity = '1';
                buttonHeight = button.offsetHeight || button.clientHeight || 36;
                button.style.visibility = originalVisibility;
                button.style.opacity = originalOpacity;
            }
            
            // テキストボックスの高さ = 白地の高さ - 上下のpadding - gap - ボタンの高さ
            const contentHeight = overlayHeight - (overlayPadding * 2) - gap - buttonHeight;
            
            // textareaやanswer-textの高さを調整
            const textarea = overlay.querySelector('textarea');
            const answerText = overlay.querySelector('.answer-text');
            
            if (textarea) {
                textarea.style.height = `${contentHeight}px`;
                textarea.style.minHeight = `${contentHeight}px`;
                textarea.style.maxHeight = `${contentHeight}px`;
            }
            
            if (answerText) {
                answerText.style.height = `${contentHeight}px`;
                answerText.style.minHeight = `${contentHeight}px`;
                answerText.style.maxHeight = `${contentHeight}px`;
            }
        }
    }, 10);
}

// リサイズ処理をデバウンスする関数
let resizeTimeout;
function debouncedUpdateVideoSize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // リサイズ時は固定widthをリセットして再計算
        fixedOverlayWidth = null;
        updateVideoSize();
    }, 100); // 100ms待機してから実行
}

// ウィンドウリサイズ時に動画サイズを更新
window.addEventListener('resize', debouncedUpdateVideoSize);

// 画面の向きが変わった時にも更新
window.addEventListener('orientationchange', () => {
    // 向きが変わった後、レイアウトが確定するまで少し待つ
    setTimeout(() => {
        // 向きが変わった時は固定widthをリセットして再計算
        fixedOverlayWidth = null;
        updateVideoSize();
    }, 200);
});

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
        // オーバーレイの位置情報を保存（切り替え前に）
        let savedBottom = null;
        let savedHeight = null;
        let savedWidth = null;
        
        if (overlay) {
            // getComputedStyleで実際の値を取得
            const computedStyle = window.getComputedStyle(overlay);
            savedBottom = computedStyle.bottom;
            savedHeight = computedStyle.height;
            savedWidth = computedStyle.width;
        }
        
        // 画像を非表示、動画を表示
        displayImage.classList.add('hidden');
        answerVideo.classList.remove('hidden');
        
        // フォームコンテンツを非表示、回答コンテンツを表示
        formContent.classList.add('hidden');
        answerContent.classList.remove('hidden');
        
        // テキストを20文字以下に制限する関数
        const limitTextLength = (text) => {
            if (text.length > 20) {
                return text.substring(0, 20);
            }
            return text;
        };
        
        // 回答エリアに「はい、[QUERY]」を表示
        answerText.textContent = limitTextLength(`はい、${question}`);
        answerText.style.fontSize = '32px';
        
        // オーバーレイの位置を即座に設定（一瞬の位置ずれを防ぐ）
        if (overlay && savedBottom && savedBottom !== 'auto') {
            overlay.style.bottom = savedBottom;
            if (savedHeight && savedHeight !== 'auto') overlay.style.height = savedHeight;
            if (savedWidth && savedWidth !== 'auto') {
                // widthを固定値として保存
                const widthValue = parseFloat(savedWidth);
                if (!isNaN(widthValue)) {
                    fixedOverlayWidth = widthValue;
                    overlay.style.width = savedWidth;
                    overlay.style.maxWidth = savedWidth;
                    overlay.style.minWidth = savedWidth;
                }
            }
        }
        
        // 回答エリアが表示された後、動画サイズと位置を更新
        // requestAnimationFrameでレイアウト確定後に実行
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateVideoSize();
            });
        });
        
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
                    answerText.textContent = limitTextLength(`はい、${question}`);
                    answerText.style.fontSize = '32px';
                } else {
                    answerText.textContent = 'そうそうそうそう';
                    answerText.style.fontSize = '32px';
                }
            } else if (!answerData) {
                answerText.textContent = 'そうそうそうそう';
                answerText.style.fontSize = '32px';
            } else if (answerData && currentTime < TIME_KI_END) {
                answerText.textContent = limitTextLength(answerData.ki);
                answerText.style.fontSize = '32px';
            } else if (answerData && currentTime < TIME_SHOU_END) {
                answerText.textContent = limitTextLength(answerData.shou);
                answerText.style.fontSize = '32px';
            } else if (answerData && currentTime < TIME_KETSU_END) {
                answerText.textContent = limitTextLength(answerData.ketsu);
                answerText.style.fontSize = '32px';
            } else if (answerData && currentTime < TIME_TTE_END) {
                answerText.textContent = 'って…';
                answerText.style.fontSize = '32px';
            } else if (answerData) {
                answerText.textContent = 'そ!';
                const originalTransition = answerText.style.transition;
                answerText.style.transition = 'none';
                answerText.style.fontSize = '70px';
                requestAnimationFrame(() => {
                    answerText.style.transition = originalTransition;
                });
            } else {
                answerText.textContent = 'そうそうそうそう';
                answerText.style.fontSize = '32px';
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
    answerText.style.fontSize = '32px';
    
    // 回答エリアのテキストボックスのサイズを維持（既に設定されているサイズを使用）
    // サイズは送信時に設定されているので、ここでは再設定しない
}

// 新しい質問ボタンの処理
newQuestionBtn.addEventListener('click', () => {
    // ボタンを非表示にする（レイアウトは維持）
    newQuestionBtn.style.visibility = 'hidden';
    newQuestionBtn.style.opacity = '0';
    newQuestionBtn.style.pointerEvents = 'none';
    
    // 動画を非表示、画像を表示
    answerVideo.classList.add('hidden');
    displayImage.classList.remove('hidden');
    
    // 回答コンテンツを非表示、フォームコンテンツを表示
    answerContent.classList.add('hidden');
    formContent.classList.remove('hidden');
    
    // 回答エリアの動画をリセット
    if (answerVideo) {
        answerVideo.pause();
        answerVideo.currentTime = 0;
    }
    
    // 固定widthをリセット（新しい質問時は再計算可能にする）
    fixedOverlayWidth = null;
    
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
    
    // 画像の読み込みエラーハンドリング
    if (displayImage) {
        displayImage.addEventListener('error', (e) => {
            console.error('display-imageの読み込みエラー:', e);
        });
        
        // 画像のロード後にサイズ計算を行う
        const initializeAfterImageLoad = () => {
            console.log('display-imageの読み込み完了');
            // 画像がロードされた後にサイズ計算を実行
            updateVideoSize();
            questionInput.focus();
        };
        
        if (displayImage.complete && displayImage.naturalHeight !== 0) {
            // 既にロードされている場合
            initializeAfterImageLoad();
        } else {
            // まだロードされていない場合、loadイベントを待つ
            displayImage.addEventListener('load', initializeAfterImageLoad, { once: true });
        }
    } else {
        // 画像要素がない場合（通常はないが、念のため）
        updateVideoSize();
        questionInput.focus();
    }
    
    if (answerVideo) {
        setupVideoErrorHandling(answerVideo, 'answer-video');
        // answer-videoは事前にメタデータを読み込む（preload="metadata"）
        // メタデータの読み込みを明示的に開始
        answerVideo.load();
    }
    
    if (loadingVideo) {
        setupVideoErrorHandling(loadingVideo, 'loading-video');
        // loading-videoは使用されるまで読み込まない（preload="none"）
    }
    
    // コマンド + エンターで送信
    questionInput.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            questionForm.dispatchEvent(new Event('submit'));
        }
    });
});

