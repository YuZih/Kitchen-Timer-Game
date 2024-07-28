import { GAME_SETTING, RECENT_RECORDS_COUNT } from './config.js';

class KitchenTimerGameServer {
	constructor() {
		/** Variables */
		this.levelSettings = GAME_SETTING;
		this.recentRecordsCount = RECENT_RECORDS_COUNT;
		this.allPlayersRecords = this.initAllPlayersRecords(); // functioning as a database
		this.userName = this.initUserName();
		this.userRecords = this.initUserRecords();
		this.selectedLevel = 'easy';
		this.targetTime = 0; // set in whole seconds, as humans typically count using whole numbers.
		this.passedMillisecond = 0; // set in millisecond
		this.timer = null;
		this.timeout = null;
		this.isRunning = false;

		/** Elements References */
		this.app = document.getElementById('app');
		this.userNameInput = document.getElementById('userName');
		this.levelsCtn = document.getElementById('levelsCtn');
		this.startBtn = document.getElementById('startBtn');
		this.targetTimeDisplay = document.getElementById('targetTimeDisplay');
		this.timerDisplay = document.getElementById('timerDisplay');
		this.pauseToggleBtn = document.getElementById('pauseToggleBtn');
		this.endBtn = document.getElementById('endBtn');
		this.backBtn = document.getElementById('backBtn');
		this.recordBtn = document.getElementById('recordBtn');
		this.modal = document.getElementById('resultModal');
		this.resultModalContent = document.getElementById('resultModalContent');
		this.resultModalCloseBtn = document.getElementById('resultModalCloseBtn');
		this.recordModalCloseBtn = document.getElementById('recordModalCloseBtn');
		this.bestRecordDisplay = document.getElementById('bestRecordDisplay');
		this.levelDetailsTableBody = document.getElementById(
			'levelDetailsTableBody'
		);
		this.latestRecordsTableBody = document.getElementById(
			'latestRecordsTableBody'
		);

		/** Initialization */
		this.initLevelOptions();
		this.initUserNameInput();
		this.initStartBtn();
		this.initEvents();
	}

	/** Helper Functions */
	setDefaultRecord() {
		const levelDetails = {};

		// 動態生成 levelDetails
		Object.keys(this.levelSettings).forEach((level) => {
			levelDetails[level] = {
				averageTime: null,
				totalCount: 0,
				compareToLastTime: 0,
			};
		});

		const defaultRecord = {
			bestRecord: null,
			recentRecords: [],
			levelDetails,
		};
		this.allPlayersRecords[this.userName] = defaultRecord;
		this.saveAllPlayersRecords();
		return defaultRecord;
	}

	saveUserName() {
		localStorage.setItem('currentUserName', this.userName);
	}

	saveAllPlayersRecords() {
		localStorage.setItem(
			'allPlayersRecords',
			JSON.stringify(this.allPlayersRecords)
		);
	}

	initAllPlayersRecords() {
		const records = localStorage.getItem('allPlayersRecords');
		return records ? JSON.parse(records) : {};
	}

	initUserName() {
		const name = localStorage.getItem('currentUserName');
		return name ? name : '';
	}

	initUserRecords() {
		if (!this.userName) return;
		const pastRecords = this.allPlayersRecords[this.userName];
		return pastRecords ? pastRecords : this.setDefaultRecord();
	}

	initLevelOptions() {
		Object.keys(this.levelSettings).forEach((key, index) => {
			const setting = this.levelSettings[key];
			const isChecked = index === 0 ? 'checked' : '';
			this.levelsCtn.innerHTML += `
				<button class="level" tabindex="0" data-key="${key}" data-level-name="${setting.levelName}">
					<input type="radio" id="${key}" class="levelRadioInput" name="level" value="${key}" ${isChecked}>
					<label for="${key}" class="levelRadioLabel"><span class="levelRadioButton"></span>${setting.levelName}</label>
				</button>
            `;
		});
	}

	initUserNameInput() {
		if (this.userName) {
			this.userNameInput.value = this.userName;
		}
	}
	initStartBtn() {
		this.startBtn.disabled = this.userName ? false : true;
	}
	initEvents() {
		this.userNameInput.addEventListener('input', () => {
			this.enableStartBtn();
		});

		this.startBtn.addEventListener('click', () => {
			this.startGame();
		});

		this.pauseToggleBtn.addEventListener('click', () => {
			this.toggleGamePause();
		});

		this.endBtn.addEventListener('click', () => {
			this.endGame(false);
		});

		this.recordBtn.addEventListener('click', () => {
			this.showPastRecords();
		});

		this.backBtn.addEventListener('click', () => {
			this.backToPage1();
		});

		// 綁定 this 的作用域
		this.handleKeydown = this.handleKeydown.bind(this);
	}

	/**
	 * Toggle the tab index of buttons on page 2 to -1.
	 * This prevents the buttons from being focused using the tab key.
	 */
	togglePage2ButtonTabIndex() {
		const buttons = document.querySelectorAll('#page2 button');
		buttons.forEach((button) => {
			if (button.getAttribute('tabindex') === '-1') {
				button.setAttribute('tabindex', '0');
			} else {
				button.setAttribute('tabindex', '-1');
			}
		});
	}

	/**
	 * @todo 將 level 改成用卡片的方式之後，需要修改這個程式碼！
	 */
	getSelectedLevel() {
		let level;
		document.getElementsByName('level').forEach((radio) => {
			if (radio.checked) {
				level = radio.value;
			}
		});
		return level;
	}

	enableStartBtn() {
		this.selectedLevel = this.getSelectedLevel();
		if (this.userNameInput.value.trim() && this.selectedLevel) {
			this.startBtn.disabled = false;
		} else {
			this.startBtn.disabled = true;
		}
	}

	getRandomIntTime(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	updateTimerDisplay() {
		const totalSeconds = Math.floor(this.passedMillisecond / 1000);
		const milliseconds = Math.floor(this.passedMillisecond % 1000);
		const seconds = totalSeconds % 60;
		const minutes = Math.floor(totalSeconds / 60);

		/** 計時器單位顯示改成小 */
		const MM = String(minutes).padStart(2, '0');
		const SS = String(seconds).padStart(2, '0');
		const ms = String(milliseconds).padStart(3, '0').slice(0, 2);
		this.timerDisplay.textContent = `${MM}:${SS}.${ms}`;

		// 加上遮罩遮擋計時器文字
		if (this.passedMillisecond === 3000) {
			this.timerDisplay.classList.add('blur');
		}
	}

	/**
	 * @todo 將 level 改成用卡片的方式，就可以不避免檢查 level 是否為 undefined 了！
	 */
	startGame() {
		this.app.classList.toggle('appPlaying');

		// const level = this.getSelectedLevel();
		// if (level === undefined) {
		//   alert("Please select a level!");
		//   return;
		// }
		// this.selectedLevel = level;

		/** 移除開始按鈕焦點以避免重複點擊 */
		this.startBtn.blur();

		/** 確認玩家 */
		const nameInputted = this.userNameInput.value.trim();
		if (this.userName !== nameInputted) {
			this.userName = nameInputted;
			this.saveUserName();
		}
		if (!this.allPlayersRecords[this.userName]) {
			this.userRecords = this.setDefaultRecord();
		}

		/** 更新等級 */
		this.selectedLevel = this.getSelectedLevel();
		console.log(1, 'selectedLevel:', this.selectedLevel);

		/** 設定目標時間 */
		const levelSettings = this.levelSettings[this.selectedLevel];
		this.targetTime = this.getRandomIntTime(
			levelSettings.minTargetTime,
			levelSettings.maxTargetTime
		);
		this.targetTimeDisplay.textContent = `Target: ${this.targetTime}`;

		/** 重置計時器秒數 */
		this.passedMillisecond = 0;
		this.updateTimerDisplay();

		/** 重置按鈕狀態 */
		this.togglePage2ButtonTabIndex();
		this.endBtn.disabled = true;
		this.pauseToggleBtn.disabled = true;
		this.pauseToggleBtn.textContent = 'Pause';

		/** 清除任何存在的計時器＆定時器，避免重複計時或加速計時 */
		if (this.timer) {
			clearInterval(this.timer);
		}
		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		/** 2 秒後開始計時 */
		this.timeout = setTimeout(() => {
			this.runTimer();
			clearTimeout();
		}, 2000);
	}

	runTimer() {
		// 開始計時
		this.isRunning = true;
		this.timer = setInterval(() => {
			this.passedMillisecond += 10;
			this.updateTimerDisplay();
		}, 10); // 每 10 毫秒更新一次計時器顯示文字

		// 更新按鈕狀態: ItsNow, Continue
		this.endBtn.disabled = false;
		this.pauseToggleBtn.disabled = false;
		this.pauseToggleBtn.textContent = 'Pause';

		// 添加鍵盤按下事件
		document.addEventListener('keydown', this.handleKeydown);
	}

	stopTimer(isEndGame) {
		// 停止計時
		this.isRunning = false;
		clearInterval(this.timer);

		// 更新按鈕狀態：Pause
		this.endBtn.disabled = true;
		if (isEndGame) {
			this.pauseToggleBtn.disabled = true;
		} else {
			this.pauseToggleBtn.textContent = 'Continue';
		}
	}

	toggleGamePause() {
		if (this.isRunning) {
			this.stopTimer(false);
			this.timerDisplay.classList.add('blur-less');
		} else {
			this.runTimer();
			this.timerDisplay.classList.remove('blur-less');
		}
	}

	endGame(isBack) {
		if (this.isRunning) {
			this.stopTimer(true);
			this.saveUserRecord(isBack);
			this.timerDisplay.classList.remove('blur');
		}

		// 移除鍵盤按下事件
		document.removeEventListener('keydown', this.handleKeydown);
	}

	backToPage1() {
		this.endGame(true);
		this.app.classList.toggle('appPlaying');
		this.togglePage2ButtonTabIndex();
	}

	handleKeydown(event) {
		if (event.shiftKey) {
			if (event.code === 'KeyS') {
				this.toggleGamePause();
			}
		} else if (event.code === 'Space') {
			this.endGame();
		}
	}

	saveUserRecord(isBack) {
		if (isBack) {
			return;
		}

		const difference = (this.passedMillisecond - this.targetTime * 1000) / 1000;

		// 更新最佳紀錄
		if (
			!this.userRecords.bestRecord ||
			Math.abs(difference) < Math.abs(this.userRecords.bestRecord)
		) {
			this.userRecords.bestRecord = difference;
		}

		// 更新最近紀錄
		this.userRecords.recentRecords.push({
			time: difference,
			level: this.selectedLevel,
		});
		if (this.userRecords.recentRecords.length > this.recentRecordsCount) {
			this.userRecords.recentRecords.shift();
		}

		// 更新等級紀錄
		const levelData = this.userRecords.levelDetails[this.selectedLevel];
		const pastAverageTime = levelData.averageTime ?? 0;
		const newTotalCount = levelData.totalCount + 1;
		const newAverageTime =
			(pastAverageTime * (newTotalCount - 1) + difference) / newTotalCount;
		const compareToLastTime =
			levelData.averageTime === null ? 0 : difference - levelData.averageTime;
		const newData = {
			averageTime: newAverageTime,
			totalCount: newTotalCount,
			compareToLastTime: compareToLastTime,
		};
		this.userRecords.levelDetails[this.selectedLevel] = newData;

		// 更新資料庫
		this.allPlayersRecords[this.userName] = this.userRecords;
		this.saveAllPlayersRecords();

		// 顯示結果互動視窗
		this.showFinalResult(difference);
	}

	async showFinalResult(difference) {
		const differenceText =
			difference === 0
				? '±0.00'
				: `${difference > 0 ? '+' : ''}${difference.toFixed(2)}`;
		this.resultModalContent.textContent = `Result: ${differenceText} seconds`;

		// 顯示結果互動視窗
		const modal = new bootstrap.Modal('#resultModal');
		modal.show();

		// 自動聚焦在關閉按鈕上
		document.getElementById('resultModal').addEventListener(
			'shown.bs.modal',
			() => {
				this.resultModalCloseBtn.focus();
			},
			{ once: true }
		);
	}

	showPastRecords() {
		console.log(1, 'this.selectedLevel', this.selectedLevel);
		const bestRecord = this.userRecords.bestRecord;
		const levelDetails = this.userRecords.levelDetails;
		const recentRecords = this.userRecords.recentRecords;

		// 顯示最佳紀錄
		this.bestRecordDisplay.textContent = bestRecord ?? '-';

		// 顯示各等級紀錄
		let levelDetailsRawHTML = '';
		for (const level in levelDetails) {
			const { averageTime, totalCount, compareToLastTime } =
				levelDetails[level];
			if (averageTime === null) {
				levelDetailsRawHTML += `
					<tr>
						<th>${level}</th>
						<td>-</td>
						<td>-</td>
					</tr>
				`;
			} else {
				let compareIcon = '';
				if (level === this.selectedLevel) {
					compareIcon =
						compareToLastTime == 0 ? '⏸️' : compareToLastTime > 0 ? '⬆️' : '⬇️';
				}
				levelDetailsRawHTML += `		 
					<tr>
						<th>${level}</th>
						<td>
							<span>${averageTime.toFixed(2)}</span>
						<span>${compareIcon}</span>
						</td>
						<td>${totalCount}</td>
					</tr>
				`;
			}
		}
		this.levelDetailsTableBody.innerHTML = levelDetailsRawHTML;

		// 顯示最近紀錄
		let recentRecordsRawHTML = '';
		const recentRecordsCount = recentRecords.length;
		if (recentRecordsCount) {
			let order = 1;
			for (let i = recentRecordsCount - 1; i >= 0; i--) {
				const { time, level } = recentRecords[i];
				recentRecordsRawHTML += `
					<tr>
						<th>#${order}</th>
						<td>${time.toFixed(2)}</td>
						<td>${level}</td>
					</tr>
				`;
				order++;
			}
		} else {
			recentRecordsRawHTML = `
				<tr>
					<th>-</th>
					<td>-</td>
					<td>-</td>
				</tr>
			`;
		}
		this.latestRecordsTableBody.innerHTML = recentRecordsRawHTML;

		const modal = new bootstrap.Modal('#recordModal');
		modal.show();

		// 自動聚焦在關閉按鈕上
		document.getElementById('recordModal').addEventListener(
			'shown.bs.modal',
			() => {
				this.recordModalCloseBtn.focus();
			},
			{ once: true }
		);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const game = new KitchenTimerGameServer();

	// Select level by clicking keyboard 'Enter' or 'Space'
	document.querySelectorAll('.level').forEach((button) => {
		button.addEventListener('keydown', (event) => {
			if (event.code === 'Enter' || event.code === 'Space') {
				const radioInput = button.querySelector('.levelRadioInput');
				if (radioInput) {
					radioInput.checked = true;
				}
			}
		});
	});

	// Auto-focus on name field if not filled
	const userNameInput = document.getElementById('userName');
	if (!userNameInput.value) {
		userNameInput.focus();
	}

	// Avoid selecting buttons in page2 by click tab key
	game.togglePage2ButtonTabIndex();
});
