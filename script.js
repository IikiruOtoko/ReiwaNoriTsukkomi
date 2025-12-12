// 動画の縦横比設定（グローバル変数）
const VIDEO_ASPECT_RATIO = 16 / 9; // 一般的な動画のアスペクト比（必要に応じて調整）
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;

// 実際の動画サイズ（既知）
const ACTUAL_VIDEO_WIDTH = 960;
const ACTUAL_VIDEO_HEIGHT = 1712;
const ACTUAL_VIDEO_ASPECT_RATIO = ACTUAL_VIDEO_WIDTH / ACTUAL_VIDEO_HEIGHT; // 約0.5607

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
const langJaBtn = document.getElementById('lang-ja');
const langEnBtn = document.getElementById('lang-en');
const languageToggle = document.getElementById('language-toggle');
const termsNotice = document.querySelector('.terms-notice');

// 言語状態（'ja' または 'en'）
// localStorageから読み込む（存在しない場合は'ja'をデフォルトとする）
let currentLanguage = localStorage.getItem('currentLanguage') || 'ja';

// エラー状態を追跡（グローバル）
let globalErrorState = false;

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
    
    // 動画サイズを計算（デスクトップの場合）
    let calculatedVideoWidth = null;
    let calculatedVideoHeight = null;
    if (!isMobilePortrait) {
        const { width, height } = calculateVideoSize();
        calculatedVideoWidth = width;
        calculatedVideoHeight = height;
        mediaElements.forEach(element => {
            element.style.width = `${width}px`;
            element.style.height = `${height}px`;
        });
    } else {
        // スマホの場合はCSSで制御（JavaScriptでサイズを設定しない）
        mediaElements.forEach(element => {
            element.style.width = '';
            element.style.height = '';
        });
    }
    
    // 動画・画像のサイズ設定後にテキストボックスの幅と位置を調整（少し遅延を入れる）
    // calculatedVideoWidthを確実に参照できるように、クロージャで保持
    setTimeout(() => {
        const container = contentArea.querySelector('.video-container');
        if (!container || !overlay) return;
        
        // 現在表示されているメディア（画像または動画）を取得
        const currentMedia = displayImage.classList.contains('hidden') ? answerVideo : displayImage;
        
        if (!currentMedia) return;
        
        const mediaRect = currentMedia.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // 幅の設定（固定widthが設定されている場合はそれを使用、そうでない場合は計算）
        let overlayWidth;
        if (fixedOverlayWidth !== null) {
            // 固定widthが設定されている場合はそれを使用
            overlayWidth = fixedOverlayWidth;
        } else {
            // 固定widthが設定されていない場合は計算
            // 動画の高さから横幅を計算（動画サイズ: 960 * 1712）
            const actualMediaHeight = mediaRect.height;
            if (actualMediaHeight > 0) {
                // 動画の高さから、アスペクト比を使って幅を計算
                const calculatedVideoWidthFromHeight = actualMediaHeight * ACTUAL_VIDEO_ASPECT_RATIO;
                // その幅の0.965倍をoverlayの幅とする
                overlayWidth = calculatedVideoWidthFromHeight * 0.965;
            } else {
                // フォールバック: 従来の方法
                if (!isMobilePortrait) {
                    const videoWidth = calculatedVideoWidth !== null && calculatedVideoWidth > 0 
                        ? calculatedVideoWidth 
                        : calculateVideoSize().width;
                    overlayWidth = videoWidth * 0.965;
                } else {
                    const actualMediaWidth = currentMedia.offsetWidth || currentMedia.clientWidth;
                    overlayWidth = actualMediaWidth * 0.965;
                }
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
            const overlayPadding = 15; // padding: 15px（上下）
            
            // textareaやanswer-textの高さを調整
            const textarea = overlay.querySelector('textarea');
            const answerText = overlay.querySelector('.answer-text');
            const formContent = overlay.querySelector('.form-content');
            const answerContent = overlay.querySelector('.answer-content');
            
            // フォーム表示時（質問時）の処理
            if (formContent && !formContent.classList.contains('hidden')) {
                const gap = 5; // gap: 5px（テキストボックスとボタンの間）
                
                // ボタンの高さを取得
                const submitBtn = overlay.querySelector('.submit-btn');
                let buttonHeight = 36; // デフォルト36px
                if (submitBtn) {
                    buttonHeight = submitBtn.offsetHeight || submitBtn.clientHeight || 36;
                }
                
                // テキストボックスの高さ = 白地の高さ - 上下のpadding - gap - ボタンの高さ
                const contentHeight = overlayHeight - (overlayPadding * 2) - gap - buttonHeight;
                
                if (textarea) {
                    textarea.style.height = `${contentHeight}px`;
                    textarea.style.minHeight = `${contentHeight}px`;
                    textarea.style.maxHeight = `${contentHeight}px`;
                }
            }
            
            // 回答表示時はanswer-textの高さを制限しない（中央配置のため）
            if (answerContent && !answerContent.classList.contains('hidden')) {
                if (answerText) {
                    // 中央配置のため、高さは自動
                    answerText.style.height = 'auto';
                    answerText.style.minHeight = 'auto';
                    answerText.style.maxHeight = 'none';
                }
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
        
        // テキストを文字数制限する関数（日本語: 20文字、英語: 40文字）
        const limitTextLength = (text) => {
            const maxLength = currentLanguage === 'ja' ? 20 : 40;
            if (text.length > maxLength) {
                return text.substring(0, maxLength);
            }
            return text;
        };
        
        // 回答エリアに初期テキストを表示
        if (currentLanguage === 'ja') {
            answerText.textContent = limitTextLength(`はい、${question}`);
        } else {
            answerText.textContent = limitTextLength(`Here, ${question}.`);
        }
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
            // エラーコードとメッセージを返す
            const errorCode = error.status || error.code || 'UNKNOWN';
            const errorMessage = error.message || '申し訳ございません。エラーが発生しました。';
            return { 
                success: false, 
                error: errorMessage,
                errorCode: errorCode
            };
        });
        
        // API結果の状態を管理
        let apiResult = null;
        let hasReached27Seconds = false;
        let retryPlayHandlers = []; // 再試行イベントハンドラーを保存
        // エラー状態をリセット
        globalErrorState = false;

        const JaFontSize = '32px';
        const EnFontSize = '28px';
        const JaFontSizeBig = '60px';
        const EnFontSizeBig = '60px';
        
        const changeTextAndFontSizeImmediately = (text, fontSize) => {
            answerText.textContent = text;
            const originalTransition = answerText.style.transition;
            answerText.style.transition = 'none';
            answerText.style.fontSize = fontSize;
            requestAnimationFrame(() => {
                answerText.style.transition = originalTransition;
            });
        };
        
        // 動画の再生時間に応じてテキストを更新する関数
        const updateAnswerTextByTime = (currentTime, answerData, question) => {
            if (currentLanguage === 'ja') {
                // 日本語版
                if (currentTime < TIME_SOUSOUSOUSOU_END) {
                    if (currentTime < TIME_HAI_END) {
                        changeTextAndFontSizeImmediately(limitTextLength(`はい、${question}`), JaFontSize);
                    } else {
                        changeTextAndFontSizeImmediately('そうそうそうそう', JaFontSize);
                    }
                } else if (!answerData) {
                    changeTextAndFontSizeImmediately('そうそうそうそう', JaFontSize);
                } else if (answerData && currentTime < TIME_KI_END) {
                    changeTextAndFontSizeImmediately(limitTextLength(answerData.ki), JaFontSize);
                } else if (answerData && currentTime < TIME_SHOU_END) {
                    changeTextAndFontSizeImmediately(limitTextLength(answerData.shou), JaFontSize);
                } else if (answerData && currentTime < TIME_KETSU_END) {
                    changeTextAndFontSizeImmediately(limitTextLength(answerData.ketsu), JaFontSize);
                } else if (answerData && currentTime < TIME_TTE_END) {
                    changeTextAndFontSizeImmediately('って…', JaFontSize);
                } else if (answerData) {
                    changeTextAndFontSizeImmediately('そ!', JaFontSizeBig);
                    
                    // 「そ!」表示後、ボタンを段階的に表示
                    setTimeout(() => {
                        newQuestionBtn.style.display = 'block';
                        // 少し遅延を入れてからフェードイン
                        setTimeout(() => {
                            newQuestionBtn.classList.add('visible');
                        }, 100);
                    }, 1500); // 「そ!」表示から0.2秒後にボタンを表示開始
                } else {
                    changeTextAndFontSizeImmediately('そうそうそうそう', JaFontSize);
                }
            } else {
                // 英語版
                if (currentTime < TIME_SOUSOUSOUSOU_END) {
                    if (currentTime < TIME_HAI_END) {
                        changeTextAndFontSizeImmediately(limitTextLength(`Here, ${question}.`), EnFontSize);
                    } else {
                        changeTextAndFontSizeImmediately('Yeah, yeah, yeah.', EnFontSize);
                    }
                } else if (!answerData) {
                    changeTextAndFontSizeImmediately('Yeah, yeah, yeah.', EnFontSize);
                } else if (answerData && currentTime < TIME_KI_END) {
                    changeTextAndFontSizeImmediately(limitTextLength(answerData.ki_en), EnFontSize);
                } else if (answerData && currentTime < TIME_SHOU_END) {
                    changeTextAndFontSizeImmediately(limitTextLength(answerData.shou_en), EnFontSize);
                } else if (answerData && currentTime < TIME_KETSU_END) {
                    changeTextAndFontSizeImmediately(limitTextLength(answerData.ketsu_en), EnFontSize);
                } else if (answerData && currentTime < TIME_TTE_END) {
                    changeTextAndFontSizeImmediately('Wait...', EnFontSize);
                } else if (answerData) {
                    changeTextAndFontSizeImmediately('Yeah!', JaFontSizeBig);
                    
                    // 「Yeah!」表示後、ボタンを段階的に表示
                    setTimeout(() => {
                        newQuestionBtn.style.display = 'block';
                        // 少し遅延を入れてからフェードイン
                        setTimeout(() => {
                            newQuestionBtn.classList.add('visible');
                        }, 100);
                    }, 1500); // 「Yeah!」表示から0.2秒後にボタンを表示開始
                } else {
                    changeTextAndFontSizeImmediately('Yeah, yeah, yeah.', EnFontSize);
                }
            }
        };
        
        // API結果を取得（非同期で実行）
        apiPromise.then(result => {
            apiResult = result;
            
            // APIエラーが発生した場合
            if (!result.success) {
                // エラー状態を設定（グローバル）
                globalErrorState = true;
                // 動画を停止
                answerVideo.pause();
                // 再試行イベントリスナーを削除
                retryPlayHandlers.forEach(handler => {
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('click', handler);
                });
                retryPlayHandlers = [];
                // エラーメッセージを表示
                displayError(result.error);
                // 「新しい質問」ボタンを表示
                newQuestionBtn.style.display = 'block';
                setTimeout(() => {
                    newQuestionBtn.classList.add('visible');
                }, 100);
                // timeupdateイベントリスナーを削除
                answerVideo.removeEventListener('timeupdate', checkTimeUpdate);
                return;
            }
            
            // APIチェック時間を過ぎていれば、すぐに動画を再開（成功時のみ）
            if (hasReached27Seconds) {
                // 現在の時刻に応じてテキストを更新
                updateAnswerTextByTime(answerVideo.currentTime, result.answerData, question);
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
                // エラー状態の場合は再生しない
                if (globalErrorState) return;
                answerVideo.play().catch(err => console.error('再試行も失敗:', err));
            };
            // タッチイベントで再試行（ハンドラーを保存）
            document.addEventListener('touchstart', retryPlay, { once: true });
            document.addEventListener('click', retryPlay, { once: true });
            retryPlayHandlers.push(retryPlay);
        });
        
        // 動画の再生時間を監視してテキストを更新
        const checkTimeUpdate = () => {
            const currentTime = answerVideo.currentTime;
            
            // APIエラーが既に返ってきている場合、動画を停止して処理を終了
            if (apiResult && !apiResult.success) {
                // エラー状態を設定（グローバル）
                globalErrorState = true;
                answerVideo.pause();
                // 再試行イベントリスナーを削除
                retryPlayHandlers.forEach(handler => {
                    document.removeEventListener('touchstart', handler);
                    document.removeEventListener('click', handler);
                });
                retryPlayHandlers = [];
                displayError(apiResult.error);
                newQuestionBtn.style.display = 'block';
                setTimeout(() => {
                    newQuestionBtn.classList.add('visible');
                }, 100);
                answerVideo.removeEventListener('timeupdate', checkTimeUpdate);
                return;
            }
            
            // 「そうそうそうそう」の終了時点でAPI結果をチェック
            if (currentTime >= TIME_SOUSOUSOUSOU_END && !hasReached27Seconds) {
                hasReached27Seconds = true;
                
                if (apiResult) {
                    // API結果が既に返ってきている場合
                    if (apiResult.success) {
                        updateAnswerTextByTime(currentTime, apiResult.answerData, question);
                        // 動画は続行（最後まで再生）
                    } else {
                        // エラーの場合、動画を停止
                        globalErrorState = true;
                        answerVideo.pause();
                        // 再試行イベントリスナーを削除
                        retryPlayHandlers.forEach(handler => {
                            document.removeEventListener('touchstart', handler);
                            document.removeEventListener('click', handler);
                        });
                        retryPlayHandlers = [];
                        displayError(apiResult.error);
                        newQuestionBtn.style.display = 'block';
                        setTimeout(() => {
                            newQuestionBtn.classList.add('visible');
                        }, 100);
                        answerVideo.removeEventListener('timeupdate', checkTimeUpdate);
                        return;
                    }
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
        
        // 最初はボタンを完全に非表示
        newQuestionBtn.style.display = 'none';
        newQuestionBtn.classList.remove('visible');
        
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
            // ボタンがまだ表示されていない場合は表示（「そ!」が表示されなかった場合のフォールバック）
            if (newQuestionBtn.style.display === 'none') {
                newQuestionBtn.style.display = 'block';
                setTimeout(() => {
                    newQuestionBtn.classList.add('visible');
                }, 100);
            }
        }, { once: true });
        
    } catch (error) {
        console.error('エラーが発生しました:', error);
        displayError('申し訳ございません。エラーが発生しました。');
    } finally {
        // 送信ボタンを再有効化
        submitBtn.disabled = false;
    }
});

// APIにリクエスト送信
async function sendToAPI(question) {
    const requestBody = {
        message: question
    };
    
    let response;
    try {
        response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
    } catch (error) {
        // ネットワークエラーなどの場合
        const networkError = new Error(`ネットワークエラー: ${error.message}`);
        networkError.status = 'NETWORK_ERROR';
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
    }
    
    if (!response.ok) {
        const errorText = await response.text();
        // console.log(errorText);
        const httpError = new Error(`API request failed: ${response.status} - ${response.statusText}`);
        httpError.status = response.status;
        httpError.code = `HTTP_${response.status}`;
        throw httpError;
    }
    
    let data;
    try {
        data = await response.json();
    } catch (error) {
        // JSONパースエラーの場合
        const parseError = new Error('Invalid response format from API');
        parseError.status = 'PARSE_ERROR';
        parseError.code = 'PARSE_ERROR';
        throw parseError;
    }
    
    // JSON形式のレスポンスをパース
    if (data.ki && data.shou && data.ketsu) {
        // JSONオブジェクトとして返す（英語版も含む）
        return {
            ki: data.ki,
            shou: data.shou,
            ketsu: data.ketsu,
            ki_en: data.ki_en || '',
            shou_en: data.shou_en || '',
            ketsu_en: data.ketsu_en || ''
        };
    } else {
        const formatError = new Error('Invalid response format from API');
        formatError.status = 'INVALID_FORMAT';
        formatError.code = 'INVALID_FORMAT';
        throw formatError;
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
    // エラー状態をリセット
    globalErrorState = false;
    
    // ボタンを完全に非表示にする
    newQuestionBtn.style.display = 'none';
    newQuestionBtn.classList.remove('visible');
    
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
        // console.log(error);
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
        // console.log(`${videoName}の読み込み開始`);
    });
    
    video.addEventListener('loadeddata', () => {
        // console.log(`${videoName}のデータ読み込み完了`);
    });
    
    video.addEventListener('canplay', () => {
        // console.log(`${videoName}の再生準備完了`);
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
            // console.log('display-imageの読み込み完了');
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
        
        // エラー状態の時は動画のクリック/タッチで再生されないようにする（一度だけ追加）
        const preventPlayOnError = (e) => {
            if (globalErrorState) {
                e.preventDefault();
                e.stopPropagation();
                answerVideo.pause();
            }
        };
        answerVideo.addEventListener('click', preventPlayOnError);
        answerVideo.addEventListener('touchstart', preventPlayOnError);
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
    
    // UIテキストを言語に応じて更新する関数
    function updateUITexts() {
        if (currentLanguage === 'ja') {
            // 日本語
            questionInput.placeholder = '物を入力してください';
            if (termsNotice) {
                termsNotice.innerHTML = '送信をもって<a href="terms-of-use-and-privacy-policy.html">利用規約</a>と<a href="terms-of-use-and-privacy-policy.html">プライバシーポリシー</a>に同意したものとみなします。内容はAI処理されます。個人情報や機密情報の記載はお控えください。';
            }
            newQuestionBtn.textContent = '新しいノリツッコミ';
        } else {
            // 英語
            questionInput.placeholder = 'Enter an item';
            if (termsNotice) {
                termsNotice.innerHTML = 'By submitting, you agree to our <a href="terms-of-use-and-privacy-policy.html">Terms of Use</a> and <a href="terms-of-use-and-privacy-policy.html">Privacy Policy</a>. Content is processed by AI. Please refrain from including personal or confidential information.';
            }
            newQuestionBtn.textContent = 'New Nori Tsukkomi';
        }
    }
    
    // 言語切り替えボタンのイベントリスナー
    if (langJaBtn && langEnBtn) {
        langJaBtn.addEventListener('click', () => {
            currentLanguage = 'ja';
            localStorage.setItem('currentLanguage', 'ja');
            langJaBtn.classList.add('active');
            langEnBtn.classList.remove('active');
            updateUITexts();
        });
        
        langEnBtn.addEventListener('click', () => {
            currentLanguage = 'en';
            localStorage.setItem('currentLanguage', 'en');
            langEnBtn.classList.add('active');
            langJaBtn.classList.remove('active');
            updateUITexts();
        });
        
        // 初期表示時に保存された言語に応じてボタンのactive状態を設定
        if (currentLanguage === 'ja') {
            langJaBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        } else {
            langEnBtn.classList.add('active');
            langJaBtn.classList.remove('active');
        }
    }
    
    // 初期表示時にUIテキストを設定
    updateUITexts();
});

