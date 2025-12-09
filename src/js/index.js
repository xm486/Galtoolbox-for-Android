<!--雪花js-->
	    function createSnowflakes() {
			const container = document.getElementById('snow-container');
			const snowflakeCount = 50;
			for (let i = 0; i < snowflakeCount; i++) {
				const snowflake = document.createElement('div');
				snowflake.className = 'snowflake';
				snowflake.style.left = `${Math.random() * 100}%`;
				snowflake.style.animationDuration = `${Math.random() * 10 + 5}s`;
				snowflake.style.opacity = `${Math.random() * 0.5 + 0.3}`;
				snowflake.style.width = `${Math.random() * 10 + 5}px`;
				snowflake.style.height = snowflake.style.width;
				container.appendChild(snowflake);
			}
		}
		window.onload = createSnowflakes;
		// 配置项
		const CONFIG = {
			TRANSLATE_API: "https://api.pearktrue.cn/api/translate/ai"
		};

		// DOM元素
		const gameInput = document.getElementById("gameInput");
		const searchResultArea = document.getElementById("searchResultArea");
		const detailArea = document.getElementById("detailArea");
		const searchBtn = document.querySelector(".btn:not(.reset-btn)");
		const coverModal = document.getElementById("coverModal");
		const modalImage = document.getElementById("modalImage");
		const coverLoading = document.getElementById("coverLoading");
		const gameCover = document.getElementById("gameCover");

		// 时长映射
		const LENGTH_MAP = {
			1: "很短",
			2: "短",
			3: "中等",
			4: "长",
			5: "很长"
		};

		// 重置所有状态
		function resetAll() {
			gameInput.value = "";
			searchResultArea.innerHTML = "输入游戏名称，点击查询获取vndb数据库结果～";
			searchResultArea.style.display = "none";
			detailArea.style.display = "none";
			closeModal();
		}

		// 智能清理文本格式，保留有意义的换行
		function cleanText(text) {
			if (!text) return "";
			
			// 先去掉首尾空白字符
			text = text.trim();
			
			// 处理不同的换行符：\r\n, \r, \n 统一为 \n
			text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			
			// 处理可能存在的HTML标签或特殊标记
			text = text.replace(/<\/?[^>]+(>|$)/g, ''); // 移除HTML标签
			text = text.replace(/\[.*?\]/g, ''); // 移除方括号内容
			
			// 处理连续的空格：多个空格变为一个
			text = text.replace(/[ \t]+/g, ' ');
			
			// 处理段落间的换行：保留有意义的分段
			// 先将连续的换行（2个或更多）替换为双换行（段落分隔）
			text = text.replace(/\n{3,}/g, '\n\n');
			
			// 处理行首空格
			text = text.replace(/^ +/gm, '');
			
			// 去掉尾随的换行
			text = text.replace(/\n+$/, '');
			
			return text;
		}

		// 翻译游戏简介 + 智能清理空白字符
		async function translateDescription(desc) {
			if (!desc) return "无简介";
			
			try {
				const pearkRes = await fetch(`${CONFIG.TRANSLATE_API}?text=${encodeURIComponent(desc)}`);
				const pearkData = await pearkRes.json();
				let result = pearkData.data?.trim() || desc.trim();
				// 使用智能清理函数
				result = cleanText(result);
				return result;
			} catch (error) {
				console.error("翻译失败：", error);
				// 原始内容同样智能清理
				return cleanText(desc);
			}
		}

		// 封面放大功能
		function openModal(imageSrc) {
			modalImage.src = imageSrc;
			coverModal.classList.add("active");
			document.body.style.overflow = "hidden";
		}

		// 关闭封面放大
		function closeModal() {
			coverModal.classList.remove("active");
			modalImage.src = "";
			document.body.style.overflow = "auto";
		}

		// 点击遮罩层关闭
		coverModal.addEventListener("click", function(e) {
			if (e.target === coverModal) {
				closeModal();
			}
		});

		// 查询游戏详情 - 修复旧数据残留问题
		async function getGameDetail(gameId) {
			const startTime = Date.now();
			detailArea.style.display = "block";
			searchResultArea.style.display = "none";
			
			// 重置所有字段为加载状态
			coverLoading.style.display = "flex";
			gameCover.style.display = "none";
			
			// 重置标题和原名
			document.getElementById("detailTitle").textContent = "";
			document.getElementById("detailOriginal").textContent = "";
			
			// 重置所有数据字段为加载状态
			const detailFields = [
				'detailLength',
				'detailReleased',
				'detailLanguages',
				'detailPlatforms',
				'detailDevelopers',
				'detailId'
			];
			
			detailFields.forEach(fieldId => {
				const element = document.getElementById(fieldId);
				if (element) {
					element.innerHTML = '<div class="loading-wrapper"><span class="spin-loading"></span></div>';
				}
			});
			
			// 重置游戏简介
			const descLoading = document.querySelector("#detailDescription").previousElementSibling;
			const descContent = document.getElementById("detailDescription");
			descLoading.style.display = "flex";
			descContent.style.display = "none";
			descContent.textContent = "";
			
			// 重置搜索时间
			document.getElementById("detailSearchTime").textContent = "";

			try {
				const res = await fetch("https://api.vndb.org/kana/vn", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						filters: ["id", "=", gameId],
						fields: "title,image.url,alttitle,released,languages,platforms,description,length,length_minutes,developers.id,developers.name"
					})
				});

				if (!res.ok) throw new Error("API请求失败");
				const data = await res.json();
				const game = data.results[0];
				if (!game) throw new Error("未找到该游戏详情");

				const translatedDesc = await translateDescription(game.description);

				// 处理时长
				const lengthText = LENGTH_MAP[game.length] || "未知";
				const hours = (game.length_minutes / 60).toFixed(1);
				const lengthStr = `${lengthText}（${hours}小时）`;

				// 处理开发商
				const developers = game.developers.map(dev => dev.name).join("、");

				// 填充数据
				gameCover.src = game.image?.url || "https://img.icons8.com/fluency/96/000000/game.png";
				coverLoading.style.display = "none";
				gameCover.style.display = "block";
				document.getElementById("detailTitle").textContent = game.title;
				document.getElementById("detailOriginal").textContent = game.alttitle || "无原名";
				document.getElementById("detailLength").textContent = lengthStr;
				document.getElementById("detailReleased").textContent = game.released || "未知";
				document.getElementById("detailLanguages").textContent = game.languages.join("、") || "未知";
				document.getElementById("detailPlatforms").textContent = game.platforms.join("、") || "未知";
				document.getElementById("detailDevelopers").textContent = developers || "未知";
				document.getElementById("detailId").textContent = game.id;
				descLoading.style.display = "none";
				descContent.style.display = "block";
				
				// 直接设置文本内容，不使用pre-line或pre-wrap
				// 使用innerHTML来处理换行
				const formattedDesc = translatedDesc.replace(/\n/g, '<br>');
				descContent.innerHTML = formattedDesc;
				
				// 更新描述容器的CSS
				const descriptionContainer = document.getElementById("descriptionContainer");
				descriptionContainer.style.whiteSpace = "normal"; // 使用正常换行
				descriptionContainer.style.wordBreak = "break-word"; // 允许单词内断行

				// 搜索耗时
				const costTime = ((Date.now() - startTime) / 1000).toFixed(2);
				document.getElementById("detailSearchTime").textContent = `搜索耗时：${costTime}s`;
			} catch (error) {
				detailArea.style.display = "none";
				searchResultArea.style.display = "block";
				searchResultArea.innerHTML = `<div class="error">获取详情失败：${error.message}</div>`;
			}
		}

		// 搜索游戏 - 修复列表渲染
		async function searchGame() {
			const gameName = gameInput.value.trim();
			if (!gameName) {
				alert("请输入游戏名称哦～");
				return;
			}

			const startTime = Date.now();
			searchResultArea.style.display = "block";
			searchResultArea.innerHTML = `
				<div class="loading-wrapper">
					<span class="spin-loading"></span>
					<span>正在查询vndb数据库...</span>
				</div>
			`;
			detailArea.style.display = "none";
			searchBtn.disabled = true;

			try {
				const res = await fetch("https://api.vndb.org/kana/vn", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						filters: ["search", "=", gameName],
						fields: "title,image.url,alttitle,released",
						count: true,
						results: 30
					})
				});

				if (!res.ok) throw new Error("API请求失败");
				const data = await res.json();
				const totalCount = data.count;
				const games = data.results;

				if (totalCount === 0) {
					searchResultArea.innerHTML = '<div class="error">未查询到相关游戏，请更换关键词重试～</div>';
					return;
				}

				let gameListHtml = `
					<div class="search-result">
						<div class="result-count">总结果数：${totalCount}（显示前30条）</div>
						<div class="game-list">
					`;
				games.forEach((game, index) => {
					// 改为通过添加类来控制动画，避免默认样式隐藏内容
					const delay = `${index * 0.05}s`;
					gameListHtml += `
						<div class="game-item item-animate" style="animation-delay: ${delay};" onclick="getGameDetail('${game.id}')">
							<div class="game-id">ID：${game.id}</div>
							<div class="game-name">${game.title}</div>
						</div>
					`;
				});
				gameListHtml += `</div></div>`;

				const costTime = ((Date.now() - startTime) / 1000).toFixed(2);
				gameListHtml += `<div class="search-time">搜索耗时：${costTime}s | 点击游戏名称查看详情</div>`;

				searchResultArea.innerHTML = gameListHtml;
			} catch (error) {
				searchResultArea.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
			} finally {
				searchBtn.disabled = false;
			}
		}

		// 回车键查询
		gameInput.addEventListener("keypress", function(e) {
			if (e.key === "Enter") {
				searchGame();
			}
		});
		
// 伸缩文字播放器逻辑
const playerContainer = document.getElementById('playerContainer');
const playerIcon = document.getElementById('playerIcon');
const playerText = document.getElementById('playerText');
const floatPlayer = document.getElementById('floatPlayer');
let isPlaying = false; // 播放状态
let isExpanded = false; // 展开状态

// 点击容器：切换播放/暂停 + 展开/收缩
playerContainer.addEventListener('click', () => {
  if (!isPlaying) {
	// 未播放：播放 + 展开
	floatPlayer.play();
	isPlaying = true;
	playerIcon.textContent = '🎵⏸️';
	playerContainer.classList.add('active');
	isExpanded = true;
  } else {
	// 已播放：暂停 + 收缩
	floatPlayer.pause();
	isPlaying = false;
	playerIcon.textContent = '🎵▶️';
	playerContainer.classList.remove('active');
	isExpanded = false;
  }
});

// 可选：点击页面其他地方收缩（优化体验）
document.addEventListener('click', (e) => {
  if (isExpanded && !playerContainer.contains(e.target)) {
	playerContainer.classList.remove('active');
	isExpanded = false;
  }
});