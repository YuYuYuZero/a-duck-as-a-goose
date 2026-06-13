/* ============================================================
   《指鸭为鹅》—— 烤腿摊求生实录
   纯属虚构 · 致敬《鹅难财》与《今天你卖的是什么腿？》
   ============================================================ */
"use strict";

/* ---------------- utils ---------------- */
const $ = id => document.getElementById(id);
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- audio (tiny synth) ---------------- */
const AUDIO = {
  ctx: null, on: localStorage.getItem("zywe_snd") !== "0",
  ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
  tone(f, t0, dur, type = "sine", vol = .15) {
    if (!this.on || !this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = f; o.connect(g); g.connect(this.ctx.destination);
    const t = this.ctx.currentTime + t0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.start(t); o.stop(t + dur + .05);
  },
  coin() { this.ensure(); this.tone(880, 0, .09, "square", .07); this.tone(1318, .07, .18, "square", .07); },
  bad() { this.ensure(); this.tone(330, 0, .18, "sawtooth", .09); this.tone(196, .12, .3, "sawtooth", .09); },
  good() { this.ensure(); this.tone(523, 0, .1, "triangle", .12); this.tone(659, .09, .1, "triangle", .12); this.tone(784, .18, .22, "triangle", .12); },
  click() { this.ensure(); this.tone(660, 0, .05, "square", .04); },
  alarm() { this.ensure(); this.tone(740, 0, .14, "square", .1); this.tone(740, .2, .14, "square", .1); this.tone(523, .4, .35, "sawtooth", .12); },
  end() { this.ensure(); [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * .13, .3, "triangle", .12)); }
};

/* ---------------- static data ---------------- */
const PRICE_TIERS = [
  { v: 25, n: "良心价", tag: "soft" },
  { v: 32, n: "市场价", tag: "mid" },
  { v: 45, n: "刺客价", tag: "hard" }
];
const COST = { goose: 22, duck: 8, green: 3 };
const LEG_NAME = { goose: "鹅腿", duck: "鸭腿", green: "翡翠腿" };
const LEG_EMOJI = { goose: "🪿", duck: "🦆", green: "🟢" };
const STALL_FEE = 30;
const TOTAL_DAYS = 7;
const PLACES = ["五道口 · 校东门", "五道口 · 校东门", "校西门 · 临时点位", "海淀黄庄 · 路口", "校东门 · 老地方", "校东门 · 老地方", "校东门 · 最后一夜"];
const CBD_PLACE = "国贸桥下 · 白领区";

const STATS_META = {
  cash: { n: "现金", i: "💰", max: 0 },
  trust: { n: "口碑", i: "🧡", max: 100 },
  conscience: { n: "良心", i: "😇", max: 100 },
  risk: { n: "风险", i: "⚠️", max: 100 },
  hype: { n: "热度", i: "🔥", max: 150 }
};

/* 顾客池：i=影响力 y=眼力 */
const CAMPUS = [
  { e: "🧑‍🎓", n: "隔壁宿舍小王", l: "阿姨，老规矩，多刷点料！", i: 1, y: 1 },
  { e: "👩‍🎓", n: "考研二战学姐", l: "吃完这只，回去背最后两章。", i: 1, y: 2 },
  { e: "🤓", n: "卷王室友", l: "我写了个抢腿脚本，0.3秒下单。", i: 2, y: 3 },
  { e: "😪", n: "赶due幸存者", l: "别问我多久没吃热乎饭了。", i: 1, y: 1 },
  { e: "🧣", n: "中文系学姐", l: "这是夜色里唯一的浪漫主义。", i: 2, y: 2 },
  { e: "🥼", n: "生科院博士", l: "我的课题方向是水禽骨骼比较解剖。", i: 2, y: 5 },
  { e: "📸", n: "校园美食UP主", l: "家人们！传说中的腿，开炫！", i: 4, y: 3 },
  { e: "🧑‍🏫", n: "青年教师", l: "低调点，别让我的学生看见。", i: 3, y: 2 },
  { e: "🛹", n: "大一新生", l: "学长说没吃过这个等于没入学。", i: 1, y: 1 },
  { e: "💪", n: "体院壮汉", l: "来三只！……行吧限购，一只。", i: 2, y: 1 },
  { e: "👓", n: "法学院同学", l: "我刚复习完《消费者权益保护法》。", i: 3, y: 4 },
  { e: "🎮", n: "电竞社社长", l: "吃完上分，今晚不坐牢。", i: 2, y: 2 },
  { e: "🧹", n: "宿管阿姨", l: "给我留一只，我十一点查完寝来拿。", i: 2, y: 3 }
];
const CBD_POOL = [
  { e: "💼", n: "国贸Linda", l: "会议间隙speed一下，能开发票吗？", i: 3, y: 3 },
  { e: "🏋️", n: "健身教练Kevin", l: "一只腿多少克蛋白？我带了食物秤。", i: 3, y: 5 },
  { e: "📉", n: "金融民工老哥", l: "大盘绿得发光，来只腿压压惊。", i: 2, y: 2 },
  { e: "🧑‍💻", n: "大厂程序员", l: "刚下班。这是我今天第一顿饭。", i: 2, y: 2 },
  { e: "👶", n: "带娃宝妈", l: "给孩子吃的，干不干净？", i: 3, y: 4 },
  { e: "👷", n: "工地大哥", l: "比盒饭强多了，来一只。", i: 1, y: 1 },
  { e: "💅", n: "探店博主Tiffany", l: "号称白领新顶流？我倒要测评一下。", i: 5, y: 4 }
];
const SPECIALS = {
  vip: { e: "💄", n: "新传大V学姐", l: "我五十万粉。今天就想拍拍这只腿。", i: 5, y: 4, kind: "vip" },
  cop: { e: "🕴️", n: "穿夹克的中年人", l: "随便看看。来一只……鹅腿吧。", i: 0, y: 0, kind: "cop" },
  scalper: { e: "🧢", n: "黄牛刀哥", l: "剩下的腿我全包，一只加五块，现结。", i: 0, y: 0, kind: "scalper" },
  owner: { e: "😤", n: "「讹腿维权群」群主", l: "我不饿。我就想看看你今天卖的是什么腿。", i: 4, y: 5, kind: "owner" },
  rich: { e: "🤵", n: "万柳少爷", l: "来一只。不用找了。", i: 3, y: 1, kind: "rich" }
};

/* 盘问题库：w=妙答 r=嘴硬 c=坦白 */
const QUIZZES = [
  { q: "阿姨，这腿是不是比上次小了一圈？", w: { t: "今年的鹅练了普拉提，比较紧致。", r: "对方愣了两秒，噗嗤笑出声，拍照发了朋友圈。" }, r: { t: "爱买买，不买让让，后面排着队呢。", r: "对方把腿拍在桌上：「我录音了。」周围的手机齐刷刷亮起。" }, c: { t: "……是鸭腿。今天鹅没到货，差价退你。", r: "对方愣住，收下退款：「下次进到鹅腿叫我。」" } },
  { q: "这骨头的弧度，怎么看着像鸭骨？", w: { t: "鹅鸭本是同宗，几千年前是一家。", r: "「好家伙，生物课代表是吧。」对方笑着啃完了。" }, r: { t: "你是懂骨头的？要不你来卖？", r: "对方还真是骨科规培生。人群安静了。" }, c: { t: "同学眼力好……这只确实是鸭腿。", r: "「行，明人不说暗话。」他付了鸭腿的价。" } },
  { q: "阿姨你看着我的眼睛：这到底是什么腿？", w: { t: "是腿，热乎的腿。天冷，先吃。", r: "对方盯了你三秒，叹口气：「行吧，确实热乎。」" }, r: { t: "清者自清，时间会证明一切。", r: "「时间只会证明物价。」对方把这句话发上了热评。" }, c: { t: "是鸭腿。与其给你换说法，不如给你换只腿。", r: "你补了一只真鹅腿。他在群里说「阿姨办事敞亮」。" } },
  { q: "我称过了，比宣传图轻了整整四十克。", w: { t: "炭火旺，水分烤干了，浓缩的才是精华。", r: "「有点道理但不多。」对方边嘀咕边付了钱。" }, r: { t: "你那秤准吗？年检了吗？", r: "他掏出了计量院的工作证。完了。" }, c: { t: "称得没错，那批是鸭腿。差价我退。", r: "他把电子秤收回包里：「冲你这句，明天还来。」" } },
  { q: "网上都说你拿鸭腿冒充鹅腿，真的假的？", w: { t: "网上还说我开路虎呢，你看我这三轮像吗？", r: "全队伍笑作一团，这段被拍下来点赞十万。" }, r: { t: "造谣！我要发律师函！", r: "「摊主扬言发律师函」冲上了同城热榜。" }, c: { t: "……鹅腿确实早就进不到货了。", r: "短暂的沉默后，有人小声说：「其实鸭腿也挺好吃。」" } },
  { q: "阿姨，直播间五十万人想知道这是什么腿。", w: { t: "是青春的味道。毕业就吃不到了。", r: "弹幕刷满「泪目」，没人再追问品类。" }, r: { t: "别拍我！把镜头关了！", r: "「心虚实锤」剪辑版当晚播放破百万。" }, c: { t: "今天这批是鸭腿，便宜十块，我说到做到。", r: "直播间刷起「诚信老板」，掉粉的反而是质疑她的人。" } },
  { q: "从尺寸、骨密度和脂肪分布看，这更接近樱桃谷鸭。", w: { t: "同学这么专业，毕业来摊里当首席科学家？", r: "「年薪开不起就算了。」博士笑着走了，没发论文。" }, r: { t: "我卖腿的时候，你还没上小学呢。", r: "博士当场展示了对照样本。围观群众掏出了笔记本。" }, c: { t: "博士面前不装了：是鸭腿。", r: "「数据诚不欺我。」他付钱时给你看了眼论文致谢。" } },
  { q: "这腿……怎么微微发绿？？", green: true, w: { t: "大葱叶榨汁腌的，纯天然，别家还没有。", r: "「高端。」对方半信半疑地吃了，还加了群。" }, r: { t: "灯光问题，夜里看什么都发绿。", r: "对方打开手电筒。绿光在夜里格外通透。" }, c: { t: "这批货有问题，你别吃了，我全退。", r: "你当众倒掉了那箱腿。有人鼓掌，有人心疼。" } },
  { q: "我朋友说她昨天买的腿，在暗处会发光？", green: true, w: { t: "那是果蔬汁腌料的天然荧光，高科技。", r: "「还有这种工艺？」她将信将疑地走了。" }, r: { t: "你朋友的眼睛该去查查了。", r: "她朋友是眼科医生。视力1.5。" }, c: { t: "那批……当我没卖过。钱我退，腿还我。", r: "你连夜回收了发光的腿。损失惨重，睡得很香。" } }
];

/* 盘问后果 */
const EYE_P = [0, .04, .1, .2, .32, .5]; // 眼力→识破概率

/* ---------- 记忆系统 ---------- */
function remember(c, outcome) {
  if (c.kind || c.returning) return;
  S.memory.push({ e: c.e, n: c.n, day: S.day, outcome, y: c.y, i: c.i });
  if (S.memory.length > 20) S.memory.shift();
}
const RETURN_LINES = {
  cheated:   ["阿姨，上次那只腿……我回去越想越不对。", "我特意带了个学生物的朋友来。", "这次我要亲眼看你从哪个箱子拿腿。"],
  honest:    ["上次的鸭腿真不错，今天还有吗？", "阿姨，我带室友来了，就冲你实诚。", "同样的鸭腿，再来一只！"],
  confessed: ["上次你退我钱的事我一直记着。", "阿姨办事敞亮，今天特地来捧场。", "我在群里帮你说了好话，今天再来看看。"],
  caught:    ["我就是来看看你改没改。", "这次再试试？我录像功能已经打开了。", "我朋友也想来见识见识。"],
  goose:     ["上次的鹅腿太好吃了，今天还要！", "阿姨我又来了！老规矩！", "带室友来回购了，她也要尝尝。"],
  soldout:   ["上次没买到，今天提前一小时来蹲的。", "排了两次都没吃到，今天必须买到！"]
};
function buildReturners() {
  if (S.day <= 1 || !S.memory.length) return [];
  const pool = S.memory.filter(m => m.day < S.day && chance(.35));
  return pool.slice(0, 2).map(m => {
    const c = { e: m.e, n: m.n, i: m.i, y: m.y, returning: true, returnType: m.outcome };
    if (m.outcome === "cheated")   { c.y = clamp(m.y + 2, 1, 5); c.l = pick(RETURN_LINES.cheated); }
    else if (m.outcome === "honest")  { c.y = Math.max(1, m.y - 1); c.l = pick(RETURN_LINES.honest); }
    else if (m.outcome === "confessed") { c.y = Math.max(1, m.y - 1); c.i = clamp(m.i + 1, 1, 5); c.l = pick(RETURN_LINES.confessed); }
    else if (m.outcome === "caught")  { c.y = 5; c.i = clamp(m.i + 1, 1, 5); c.l = pick(RETURN_LINES.caught); }
    else if (m.outcome === "goose")   { c.l = pick(RETURN_LINES.goose); }
    else { c.l = pick(RETURN_LINES.soldout); }
    return c;
  });
}

/* ---------- 互动群聊 ---------- */
const CHAT_QUESTIONS = [
  { q: "今天到底是鹅还是鸭啊？在线等，挺急的", opts: [
    { t: "当然是鹅！来就完了 🪿", fx: { hype: [2, 4], risk: [1, 3] } },
    { t: "今天进了什么卖什么，来了就知道", fx: { trust: [1, 3] } },
    { t: "（假装没看见）", fx: {} }
  ]},
  { q: "阿姨今晚几点出摊？我要翘自习来排", opts: [
    { t: "老时间！别翘课，先把作业写完", fx: { trust: [2, 4], hype: [1, 2] } },
    { t: "来晚了可就没了哦～", fx: { hype: [3, 5] } },
    { t: "（假装没看见）", fx: {} }
  ]},
  { q: "有人拼团吗？五个人起送打九折可以不", opts: [
    { t: "不讲价！但五人团我多送一包辣椒面", fx: { trust: [2, 4], hype: [2, 3], cash: [-5, -2] } },
    { t: "这主意好，搞个拼团接龙！", fx: { hype: [4, 7], risk: [1, 2] } },
    { t: "（假装没看见）", fx: {} }
  ]},
  { q: "昨天的腿是不是小了点？就我一个人觉得？", opts: [
    { t: "每只腿大小不一样很正常，是散养鹅嘛", fx: { risk: [-2, 0], trust: [1, 2] } },
    { t: "你觉得小，那明天给你挑个大的", fx: { trust: [2, 4], conscience: [1, 2] } },
    { t: "（假装没看见）", fx: { risk: [1, 3] } }
  ]},
  { q: "说实话，就算是鸭腿我也吃，好吃就行了", opts: [
    { t: "哈哈哈你这话我存了，当免责声明用", fx: { hype: [2, 4], conscience: [-1, 0] } },
    { t: "放心，每只腿品类都会标清楚的", fx: { trust: [2, 4], conscience: [1, 2] } },
    { t: "（假装没看见）", fx: {} }
  ]},
  { q: "隔壁老李开始卖了，要不要去探探敌情", opts: [
    { t: "不用管他，做好自己的腿就行", fx: { trust: [2, 3], conscience: [1, 2] } },
    { t: "去！拍个照回来给大家品鉴品鉴", fx: { hype: [3, 5], risk: [1, 3] } },
    { t: "（假装没看见）", fx: {} }
  ]}
];
let chatQTimer = null;
function showChatQuestion() {
  if (!S || S.over || busy) return;
  const pool = CHAT_QUESTIONS.filter((_, i) => !S.usedChatQ.includes(i));
  if (!pool.length) return;
  const idx = CHAT_QUESTIONS.indexOf(pick(pool));
  S.usedChatQ.push(idx);
  const cq = CHAT_QUESTIONS[idx];
  const feed = $("chatFeed");
  if (!feed) return;
  pushChat(cq.q, pick(CHAT_NAMES), S.risk >= 50 ? "hot" : "");
  const wrap = document.createElement("div");
  wrap.className = "chat-reply-wrap";
  wrap.innerHTML = cq.opts.map((o, i) => `<button class="chat-reply-btn" data-i="${i}">${esc(o.t)}</button>`).join("");
  feed.appendChild(wrap);
  feed.scrollTop = feed.scrollHeight;
  wrap.querySelectorAll(".chat-reply-btn").forEach(b => b.onclick = () => {
    const opt = cq.opts[+b.dataset.i];
    wrap.remove();
    if (opt.t.includes("假装没看见")) {
      pushChat("阿姨不回消息了……", pick(CHAT_NAMES));
    } else {
      pushChat(opt.t, "鹅腿阿姨🪿", "sys");
      const reactions = ["哈哈哈哈阿姨说话太有意思了", "有被阿姨可爱到", "阿姨在线回复！尊贵感拉满", "笑死，存到收藏夹了"];
      setTimeout(() => pushChat(pick(reactions), pick(CHAT_NAMES)), 800);
    }
    AUDIO.click();
    applyFx(opt.fx);
  });
  const autoSkip = setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 15000);
  const origRemove = wrap.remove.bind(wrap);
  wrap.remove = () => { clearTimeout(autoSkip); origRemove(); };
}
function startChatQ() { stopChatQ(); chatQTimer = setInterval(() => { if (chance(.3)) showChatQuestion(); }, 8000); }
function stopChatQ() { if (chatQTimer) { clearInterval(chatQTimer); chatQTimer = null; } }

/* 弹幕池 */
const CHAT_NAMES = ["鹅腿等等我", "绩点3.9还在抢腿", "今晚吃什么·清", "圆明园技校碳水组", "中关村文理干饭人", "Linda在国贸", "匿名水友", "显微镜侠", "夜宵雷达", "腿圈纪检委", "干饭不积极思想有问题", "蹲腿第七天"];
const CHAT_CALM = [
  "排了四十分钟，前面还有六十个人……",
  "阿姨记得我！还问我考研上岸没 😭",
  "蹲一个代抢，有偿，急",
  "这就是青春的味道吗，呜呜",
  "刚抢到！舍友已经把我拉黑了（他没抢到）",
  "DNA动了，是炭火的香味",
  "吃完去操场跑两圈，负罪感清零",
  "别问，问就是鹅 🪿",
  "今天风好大，腿都吹凉了还在排",
  "限购一只真的悲伤，我能炫三只",
  "蹲到了！朋友圈先发为敬",
  "建议办张会员卡，我能吃到毕业",
  "刚咬第一口我室友就后悔没来了",
  "这个酱料配方建议申遗",
  "我已经连续七天排队了，比上班打卡还准时",
  "有没有人统计过这学期的腿均消费",
  "阿姨笑起来好温柔，像我姥姥",
  "大冬天的路灯下排队，我们在干什么啊哈哈哈",
  "刚发了九宫格，已经三十个人问定位了",
  "这才是真正的夜校吧"
];
const CHAT_SUS = [
  "理性讨论：鹅和鸭真有人吃得出区别吗？",
  "说实话，最近的腿是不是小了一圈？",
  "楼上的，建议送生科院做个鉴定",
  "我怎么觉得骨头不太对劲……",
  "有人把腿骨照片发到鉴定区了",
  "显微镜网友已就位 🔬",
  "蹲一个后续，瓜子已备好",
  "群里有人说差点吃出问题？求证",
  "建议公示一下进货单（理性发言）",
  "楼下那位是不是在拍照取证？",
  "我朋友是做食品检测的，要不要帮忙看看",
  "价格涨了但腿没变大，是错觉吗",
  "有人注意到招牌上「鹅」字磨损得特别快吗",
  "纯好奇：鹅和鸭的骨头到底怎么分"
];
const CHAT_DOOM = [
  "塌房倒计时？",
  "「讹腿维权群」二维码失效了，求拉",
  "退钱！！！",
  "我已经截图了，跑不掉的",
  "记者朋友说在跟这个选题了",
  "市监局的热线我存好了",
  "当初排队三小时，如今维权九十九",
  "求一个内部群，听说有大瓜",
  "刚才有人报警了吧？我看到有人打电话",
  "这下全网都知道了",
  "有律师出来说可以集体诉讼了",
  "我把所有购买记录都留着呢"
];
const CHAT_CBD = [
  "国贸的姐妹冲！比楼下轻食好吃多了",
  "会议室飘着腿香，老板都馋了",
  "打工人的命也是命，腿是唯一的光",
  "今天大盘和这只腿一样绿 🙃",
  "投行同事人手一只，跟工牌很配"
];

/* 舆论事件 */
const EVENTS = [
  {
    id: "intro", prio: 100, once: true, cond: S => S.day === 1,
    title: "开张第一夜，群已经爆了", where: "宿舍楼下 · 23:40",
    text: "三个学校的抢腿群为「明晚到底去哪个门」吵了八百楼。<b>预订接龙已经排到了300号</b>，而你明天最多烤一百只。",
    choices: [
      { t: "按学校轮流来，提前一天公告", h: "秩序感，是小摊最贵的装修。", fx: { trust: [6, 10], hype: [2, 5], conscience: [2, 4] }, r: "公告发出后，三个群罕见地安静了。有人置顶了你的排班表，像课程表一样转发。" },
      { t: "谁来得早卖谁，自由竞争", h: "让市场说话，让闹钟内卷。", fx: { cash: [20, 40], hype: [6, 10], trust: [-3, 1] }, r: "凌晨五点就有人来占位。你看着黑眼圈的队伍，第一次理解了什么叫「腿比命贵」。" },
      { t: "开「加急通道」：加十元可插队", h: "排队的尽头是商业模式。", fx: { cash: [60, 90], conscience: [-8, -5], trust: [-6, -3], hype: [7, 12] }, r: "加急通道当晚收入可观。也有人在群里发了一句：「原来腿和人一样，分三六九等。」" }
    ]
  },
  {
    id: "scalper", prio: 6, once: true, cond: S => S.hype >= 35,
    title: "代抢党出现了", where: "二手平台 · 0:20",
    text: "二手平台冒出几十个「代抢腿」链接，加价二十还包跑腿。群里有人@你：<b>「阿姨管管，根本抢不到！」</b>",
    choices: [
      { t: "实名限购，黄牛一律拉黑", h: "队伍干净了，财路变窄了。", fx: { trust: [7, 11], hype: [-6, -2], cash: [-20, -5], conscience: [3, 6] }, r: "你举着小本子核对学生证的样子被拍下来，配文：「全网最有原则的摊」。" },
      { t: "睁一只眼闭一只眼", h: "卖给谁不是卖呢。", fx: { cash: [25, 45], risk: [4, 8], trust: [-5, -2] }, r: "黄牛们很守规矩地排队，像一支沉默的施工队。真正的学生越来越难抢到了。" },
      { t: "和黄牛合作：他们包销三成", h: "把对手变成渠道。", fx: { cash: [90, 130], conscience: [-10, -6], risk: [8, 13], hype: [4, 8] }, r: "出货稳了，钱也稳了。只是群里开始流传一句话：「现在吃腿，得先过刀哥那关。」" }
    ]
  },
  {
    id: "microscope", prio: 7, once: true, cond: S => S.c.duckSold >= 8,
    title: "显微镜时代来临", where: "校园论坛 · 1:10",
    text: "一篇《关于腿的尺寸变化的纵向研究（2023-2026）》登上论坛热榜，楼主<b>逐帧对比了三年来的腿照</b>，结论：缩水11.4%。",
    choices: [
      { t: "下场回帖：附上今天的进货单", h: "用纸面打败显微镜。", fx: { risk: [-12, -7], trust: [4, 8], hype: [3, 6], cash: [-15, -5] }, r: "进货单照片被顶到首页。有人发现你今天确实进了鸭腿——但写明了的鸭腿，反而没人骂。" },
      { t: "不回应，让帖子自己沉下去", h: "互联网没有记忆，可能吧。", fx: { risk: [5, 9], hype: [2, 5] }, r: "帖子沉了三天，又被人挖出来，标题加了俩字：「实锤？」" },
      { t: "发小号带节奏：「楼主是同行」", h: "进攻是最好的防守，大概。", fx: { risk: [10, 16], hype: [6, 10], conscience: [-7, -4] }, r: "小号被扒出IP和你常用设备一致。论坛出现新热帖：《论摊主的赛博分身》。" }
    ]
  },
  {
    id: "greenpic", prio: 8, once: true, cond: S => S.c.greenSold >= 1,
    title: "一张荧光绿的照片", where: "维权群 · 2:05",
    text: "深夜，有人在群里发了张照片：暗处的腿泛着<b>幽幽的绿光</b>，配文「这正常吗」。转发量正以肉眼可见的速度上涨。",
    choices: [
      { t: "公告：那批货已全部召回销毁", h: "把损失写在明面上。", fx: { cash: [-80, -50], risk: [-14, -8], trust: [3, 7], conscience: [6, 10] }, r: "你直播销毁了整箱绿腿。弹幕从「作秀」慢慢变成「行吧，是真烧了」。" },
      { t: "回应：大葱叶榨汁腌制，纯天然", h: "经典话术，再用一次。", fx: { risk: [8, 14], hype: [8, 14], conscience: [-6, -3] }, r: "「大葱叶榨汁」冲上热梗榜第三。一半人玩梗，一半人当真，还有人真去拿大葱腌了只腿——没绿。" },
      { t: "装没看见，照常营业", h: "夜那么黑，绿光那么小。", fx: { risk: [12, 18], hype: [4, 8] }, r: "照片越传越广。第二天有顾客自带紫外线手电来买腿，像在鉴定文物。" }
    ]
  },
  {
    id: "rival", prio: 5, once: true, cond: S => S.day >= 3,
    title: "隔壁老李宣战", where: "三十米外 · 22:30",
    text: "三十米外支起了新摊，横幅猎猎作响：<b>「老李真鹅腿，假一赔十，欢迎验DNA」</b>。他还冲你这边意味深长地笑了笑。",
    choices: [
      { t: "也挂横幅：「本摊腿品类，当日公示」", h: "跟进透明，对线到底。", fx: { trust: [6, 10], conscience: [4, 7], hype: [4, 8], cash: [-10, 0] }, r: "两条横幅在夜风里对峙，被做成表情包。意外的是，公示之后你的鸭腿反而卖得更好了。" },
      { t: "打价格战：全场降五元", h: "让利润先倒下。", fx: { cash: [-60, -30], hype: [8, 13], trust: [2, 5] }, r: "降价当晚队伍翻倍。老李的横幅第二天加了一行小字：「我们不打价格战，我们打DNA。」" },
      { t: "雇人去老李家排队占坑", h: "兵不厌诈，腿不厌细。", fx: { cash: [-30, -15], risk: [9, 15], conscience: [-8, -5] }, r: "你雇的人在老李摊前吃了三只，回来汇报：「老板，他那个是真好吃。」士气大跌。" }
    ]
  },
  {
    id: "reporter", prio: 8, once: true, cond: S => S.risk >= 45,
    title: "记者的私信", where: "凌晨的手机 · 1:45",
    text: "一条私信安静地躺在收件箱：「您好，我是市里都市频道的记者，<b>关注到关于您摊位品类的讨论</b>，想约个采访，您方便吗？」",
    choices: [
      { t: "接受采访，有问必答", h: "镜头前没有剪辑权，但有主动权。", fx: { risk: [-10, -4], trust: [3, 8], hype: [10, 16], conscience: [3, 6] }, r: "采访播出，你那句「进到什么腿就写什么腿」被做成了标题。评论区第一次出现大面积的「支持」。" },
      { t: "已读不回", h: "不说话，就不会说错话。", fx: { risk: [6, 10] }, r: "三天后报道照常播出，你的位置被打了码，配音说：「摊主拒绝回应。」听起来比任何回答都糟。" },
      { t: "托人打听记者背景", h: "知己知彼，虽然有点歪。", fx: { risk: [3, 8], cash: [-30, -10], conscience: [-5, -2] }, r: "托的人办事不密，「摊主找关系」的截图先一步上了网。原本的小选题变成了大选题。" }
    ]
  },
  {
    id: "inspect", prio: 9, once: true, cond: S => S.risk >= 60,
    title: "市监局的电话", where: "上午十点 · 来电",
    text: "电话那头很客气：「接到群众反映，<b>请您配合一次例行抽检</b>，主要是品类标识和冷链记录。明天上午方便吗？」",
    choices: [
      { t: "全力配合，主动交出台账", h: "账本干不干净，自己最清楚。", fx: { risk: [-20, -12], cash: [-50, -25], trust: [5, 9], conscience: [5, 9] }, r: "抽检结果贴在摊前：「标识不规范，限期整改」。不算光彩，但比传闻里的任何版本都体面。" },
      { t: "说自己最近「回老家了」", h: "拖字诀，江湖永流传。", fx: { risk: [8, 14], hype: [3, 7] }, r: "你的摊「消失」了两天。群里的寻腿启事越发越多，配图是空荡荡的路灯。" },
      { t: "连夜把库存全换成真鹅腿", h: "临时抱佛脚，佛累不累另说。", fx: { cash: [-120, -80], risk: [-8, -2], conscience: [-4, -1] }, r: "抽检顺利通过。只是那批连夜高价进的鹅腿，让这个月的利润表很难看。" }
    ]
  },
  {
    id: "cbd", prio: 9, once: true, cond: S => S.day >= 4 && S.hype >= 50 && !S.flags.cbd,
    title: "来自国贸的邀请", where: "新建群聊 · 21:00",
    text: "一个新群把你拉了进去：「CBD打工人干饭联盟（含投行/大厂/律所）」。群主说：<b>「阿姨，您来国贸出摊吧，我们客单价高，不讲价。」</b>",
    choices: [
      { t: "进军CBD！白领的钱也是钱", h: "解锁新客群，客单价更高，但白领们……带秤。", fx: { hype: [10, 16], cash: [30, 60] }, flag: "cbd", r: "第一晚试营业，Linda们拎着电脑包排队，像一场安静的发布会。你解锁了「刺客价」的勇气。" },
      { t: "婉拒：摊子小，守着学校就好", h: "校园是根据地，也是舒适区。", fx: { trust: [6, 10], conscience: [3, 6], hype: [-5, -1] }, r: "你把邀请截图发在校园群：「哪也不去，就在这。」当晚有人给你送了杯热奶茶。" },
      { t: "两头跑：学校CBD轮流摆", h: "我全都要，腿和命一起燃烧。", fx: { hype: [8, 13], cash: [20, 45], trust: [-4, -1], risk: [3, 6] }, flag: "cbd", r: "三轮车的里程数翻了倍。两边的群都在猜你今晚去哪，像在追一部连载。" }
    ]
  },
  {
    id: "mcn", prio: 6, once: true, cond: S => S.hype >= 70,
    title: "MCN的合同", where: "咖啡馆 · 下午",
    text: "西装革履的年轻人推来一份合同：「阿姨，您是天生的IP。签约后我们包装『腿姐』人设，<b>直播带货，首月保底五千</b>。」",
    choices: [
      { t: "签！流量不蹭白不蹭", h: "从摊主到主播，一步之遥。", fx: { cash: [380, 480], hype: [15, 22], conscience: [-9, -5], risk: [6, 10] }, r: "首播在线破十万。运镜永远对着炭火和笑脸，选品链接里悄悄上了一款「风味腿」预制菜。" },
      { t: "拒绝：摊主不需要人设", h: "腿好吃，比什么都上镜。", fx: { trust: [5, 9], conscience: [5, 8], hype: [-8, -3] }, r: "「被MCN拒签的阿姨」反而小火了一把。年轻人临走时买了只腿，说比合同实在。" },
      { t: "只合作一场，试试水", h: "中庸之道，浅尝辄止。", fx: { cash: [120, 180], hype: [8, 13], risk: [2, 5] }, r: "试播效果不错，但你拒绝了读稿环节。运营在复盘会上写：「该IP不可控。」" }
    ]
  },
  {
    id: "banner", prio: 5, once: true, cond: S => S.trust >= 70,
    title: "一面锦旗", where: "摊位前 · 22:50",
    text: "几个常客学生抱来一面连夜定制的锦旗：<b>「宇宙第一腿 · 童叟无欺」</b>，还配了喇叭和彩带，阵仗大得像颁奖。",
    choices: [
      { t: "挂在摊位最显眼处", h: "民间认证，含金量极高。", fx: { trust: [5, 9], hype: [8, 13], conscience: [2, 4] }, r: "锦旗成了新地标。导航软件上，你的摊位被用户标注成「宇宙第一腿（官方认证）」。" },
      { t: "收下，但只挂在三轮车里", h: "低调，荣誉是用来还的。", fx: { trust: [3, 6], conscience: [4, 7] }, r: "每次开车门都能看见那行字。后来你进货时多检查了三遍品类，怕对不起它。" },
      { t: "借势搞「锦旗同款套餐」", h: "感动归感动，套餐归套餐。", fx: { cash: [70, 110], hype: [6, 10], trust: [-4, -1], conscience: [-4, -2] }, r: "套餐卖爆了。只是送锦旗的同学路过时小声说：「我们送的是旗，不是商标。」" }
    ]
  },
  {
    id: "shortage", prio: 7, once: true, cond: S => S.day >= 5,
    title: "鹅腿，全国性告急", where: "供应商电话 · 8:30",
    text: "供应商的声音很疲惫：「别问了，<b>全国的鹅腿都紧张</b>，明天最多给你四只。鸭腿管够，要多少有多少。」",
    choices: [
      { t: "公告：鹅腿告急，明日多为鸭腿", h: "把坏消息自己说出口。", fx: { trust: [6, 10], conscience: [5, 8], hype: [2, 6], cash: [-15, 0] }, r: "公告下的高赞评论：「能提前说，就还值得排。」第二天鸭腿卖光了。" },
      { t: "悄悄囤鸭腿，招牌先不改", h: "船到桥头自然直，腿到嘴边自然香。", fx: { cash: [30, 60], risk: [8, 13], conscience: [-6, -3] }, r: "冷柜塞满了鸭腿。你把「鹅」字招牌擦得很亮，亮得有点心虚。" },
      { t: "高价从外地调真鹅腿", h: "用利润换一个问心无愧。", fx: { cash: [-100, -60], trust: [4, 8], conscience: [6, 9] }, r: "凌晨三点你去高速口接货。师傅说跑了六百公里，「就为这一车腿，值吗？」你说值。" }
    ]
  },
  {
    id: "weiquan", prio: 8, once: true, cond: S => S.risk >= 55 && S.trust < 55,
    title: "「讹腿维权群」成立", where: "群人数 998 · 23:59",
    text: "一个新群的截图在疯传，群名起得相当文学：<b>「讹腿维权群」</b>。置顶公告写着：收集证据，统一行动，按只索赔。",
    choices: [
      { t: "进群道歉，承诺无条件退款", h: "把火扑在群里，别等它上街。", fx: { cash: [-110, -70], risk: [-15, -9], trust: [4, 9], conscience: [6, 10] }, r: "你在群里发了长文和退款码。有人骂，有人退，群主默默把群名改成了「腿友交流群」。" },
      { t: "装死，一个群而已", h: "998人，能成什么气候。", fx: { risk: [10, 16] }, r: "第二天群满2000人，开了二群。群主很有管理才能，甚至排了值班表轮流盯你的摊。" },
      { t: "发声明：将追究造谣者责任", h: "法务式嘴硬。", fx: { risk: [8, 14], hype: [6, 11], trust: [-6, -2] }, r: "声明被逐句标红分析，阅读量是你历史峰值的十倍。律师朋友私信你：「下次发之前问我一句。」" }
    ]
  },
  {
    id: "invest", prio: 5, once: true, cond: S => S.cash >= 2000,
    title: "投资人来了", where: "黑色SUV · 22:00",
    text: "一辆黑色SUV停在摊前，下来的人递上名片：「我们看好<b>『腿经济』赛道</b>，想聊聊连锁加盟，先给您估值八百万。」",
    choices: [
      { t: "聊！把摊位做成品牌", h: "从夫妻店到连锁店的惊险一跃。", fx: { cash: [200, 300], hype: [12, 18], conscience: [-7, -4], risk: [5, 9] }, r: "BP里你的三轮车被称为「移动终端」。第一家加盟店开业当天，腿的克重悄悄标准化了——往小了标。" },
      { t: "拒绝：摊就是摊，不是赛道", h: "有些生意做不大，但做得明白。", fx: { trust: [5, 9], conscience: [5, 8] }, r: "投资人遗憾离场前买了两只腿，说这是他尽调过「单位经济模型最好吃」的项目。" },
      { t: "要个顾问名头，不出让股份", h: "白嫖资源，概不奉陪。", fx: { cash: [50, 90], hype: [4, 8] }, r: "你成了「腿经济研究院特聘顾问」。证书挂在摊前，和锦旗、营业执照排成一排，像个小型荣誉墙。" }
    ]
  },
  {
    id: "calm", prio: 0, once: false, cond: () => true,
    title: "难得安静的一晚", where: "收摊路上 · 0:30",
    text: "没有热搜，没有质问，只有炭火慢慢暗下去的声音。你蹬着三轮车回家，<b>车筐里是今天的账本</b>。",
    choices: [
      { t: "把账认真对一遍", h: "数字不会骗人，骗人的是备注。", fx: { cash: [10, 25], conscience: [1, 3] }, r: "对完账你发现今天多收了顾客五块钱，记在本子上，明天见到他还回去。" },
      { t: "给家里打个电话", h: "摊是生计，人是牵挂。", fx: { conscience: [2, 5], trust: [1, 3] }, r: "电话里你说一切都好。挂了电话，路灯把影子拉得很长，像还排着昨天的队。" },
      { t: "刷刷大家怎么夸你", h: "适度自恋有益身心。", fx: { hype: [3, 6] }, r: "你刷到一条视频：有人模仿你颠勺的动作，配乐是《孤勇者》。你笑出了声，存进了收藏夹。" }
    ]
  }
];

/* 结局：按顺序匹配 */
const ENDINGS = [
  { id: "boom", death: true, grade: "C", e: "💥", t: "热搜第一，摊位归零", s: "流量兑现的那晚，退款群排到了第二页。", q: "「大家爱的从来不是鹅，是『不会被骗』这四个字。」", check: S => S.risk >= 100 },
  { id: "broke", death: true, grade: "C", e: "🕯️", t: "炭火熄灭", s: "现金归零。炉子是热的，账是凉的。", q: "「创业未半，而中道收摊。」", check: S => S.cash < 0 },
  { id: "hated", death: true, grade: "C", e: "😤", t: "维权群的全面胜利", s: "口碑清零，群主把你摊位的照片设成了群头像，留作纪念。", q: "「讹腿者，鹅腿也。」", check: S => S.trust <= 0 },
  { id: "keeper", grade: "S", e: "🪿", t: "真·鹅腿守门人", s: "整整七天，没有一只鸭腿冒充过鹅腿。赚得不多，睡得极好。", q: "「鹅腿少的时候，我就只卖鹅腿。」", check: S => S.c.duckSold === 0 && S.c.greenSold === 0 },
  { id: "fire", grade: "S", e: "🔥", t: "烟火气长存", s: "队伍不再是最长的，但每个排队的人都知道自己买的是什么。", q: "「我卖的是腿，押上的是名字。」", check: S => S.conscience >= 70 && S.trust >= 65 },
  { id: "tycoon", grade: "S", e: "💰", t: "万柳鹅腿大亨", s: "金链子、新三轮，和一摞看不太懂但很厚的合同。", q: "「恭喜！为儿子全款拿下万柳一平米。」", check: S => S.cash >= 2200 },
  { id: "cbdking", grade: "A", e: "🏙️", t: "从五道口到CBD", s: "Linda们叫你「腿姐」，还给你定制了工牌挂绳。", q: "「在国贸，连腿都要预约会议室。」", check: S => S.flags.cbd && S.cash >= 1600 },
  { id: "artist", grade: "A", e: "🗣️", t: "语言艺术大师", s: "七天里你没说过一个「假」字，也没说过一个答案。", q: "「是腿，热乎的腿。」", check: S => S.c.quizWin >= 6 && S.risk < 60 },
  { id: "master", grade: "A", e: "🎭", t: "指鸭为鹅·集大成者", s: "整周无人验出DNA。学生吃味道，网友吃故事，你吃信息差。", q: "「我没说过它是鹅，我只是没说它是鸭。」", check: S => S.c.duckSold >= 25 && S.c.quizLose <= 2 },
  { id: "jade", grade: "B", e: "🟢", t: "翡翠腿宗师", s: "大葱叶榨汁的传说，将在午夜的紫外线手电下永远流传。", q: "「纯天然，发光的那种。」", check: S => S.c.greenSold >= 6 },
  { id: "internet", grade: "B", e: "📱", t: "人设成功上市", s: "直播间永远对着炭火，从不对着菜单。", q: "「卖多少只腿不重要，播放量才是主食。」", check: S => S.hype >= 90 && S.conscience < 50 },
  { id: "brake", grade: "A", e: "🛑", t: "及时刹车", s: "你把「对不起」明码标价，居然真的还有回头客。", q: "「认错不丢人，丢人的是菜单。」", check: S => S.c.confess >= 3 && S.trust >= 40 },
  { id: "normal", grade: "B", e: "🍂", t: "普通摊主的一周", s: "没有热搜，没有塌房，只有七个具体的夜晚和一本对得上的账。", q: "「从传说退回普通人，不是坠落，是落地。」", check: S => S.conscience >= 45 },
  { id: "muddle", grade: "C", e: "🌫️", t: "糊里糊涂活下来了", s: "你也说不清这周到底卖了什么。反正，都卖完了。", q: "「鹅鸭之间，自有大道。」", check: () => true }
];

const BADGES = [
  { id: "artist", e: "🗣️", t: "语言艺术家", check: S => S.c.quizWin >= 3 },
  { id: "alchemy", e: "🦆", t: "水禽炼金术", check: S => S.c.duckSold >= 25 },
  { id: "pure", e: "🪿", t: "一鹅到底", check: S => S.c.duckSold === 0 && S.c.greenSold === 0 },
  { id: "honest", e: "😇", t: "老实人", check: S => S.c.confess >= 3 },
  { id: "label", e: "🏷️", t: "明码标价", check: S => S.c.duckHonest >= 12 },
  { id: "soldout", e: "🧊", t: "售罄的艺术", check: S => S.c.soldOut >= 8 },
  { id: "rich", e: "💵", t: "第一桶金", check: S => S.cash >= 2000 },
  { id: "survivor", e: "🔬", t: "显微镜下幸存", check: S => S.flags.hadRisk80 },
  { id: "cbd", e: "🏙️", t: "进军CBD", check: S => S.flags.cbd }
];

/* ---------------- state ---------------- */
let S = null;
let busy = false;
let ambientTimer = null;

function newState() {
  return {
    day: 1, cash: 150, trust: 50, conscience: 60, risk: 10, hype: 22,
    stock: { goose: 0, duck: 0, green: 0 },
    price: 32, priceTag: "mid",
    queue: [], qi: 0,
    flags: { cbd: false, hadRisk80: false, greenUnlockTold: false, tutorialShown: false },
    c: { gooseSold: 0, duckSold: 0, duckHonest: 0, greenSold: 0, quizWin: 0, quizLose: 0, confess: 0, soldOut: 0, nightRevenue: 0, weekLegs: 0 },
    memory: [],
    usedEvents: [], usedQuiz: [], usedChatQ: [], over: false
  };
}

/* ---------------- stats UI ---------------- */
function renderStatsBar() {
  $("statsBar").innerHTML = Object.keys(STATS_META).map(k => {
    const m = STATS_META[k];
    return `<div class="stat s-${k}" id="stat-${k}">
      <div class="si">${m.i}</div><div class="sn">${m.n}</div>
      <div class="sv" id="sv-${k}">0</div>
      <div class="bar"><i id="sb-${k}"></i></div></div>`;
  }).join("");
}
function updateStats(deltas) {
  for (const k of Object.keys(STATS_META)) {
    const el = $("sv-" + k), bar = $("sb-" + k), box = $("stat-" + k);
    if (!el) continue;
    el.textContent = k === "cash" ? "¥" + Math.round(S[k]) : Math.round(S[k]);
    if (bar) {
      const max = STATS_META[k].max;
      bar.style.width = max ? clamp(S[k] / max * 100, 0, 100) + "%" : clamp(S.cash / 3000 * 100, 2, 100) + "%";
    }
    if (deltas && deltas[k]) {
      box.classList.remove("pulse"); void box.offsetWidth; box.classList.add("pulse");
      const f = document.createElement("span");
      const v = deltas[k];
      f.className = "fly-delta " + ((k === "risk" ? v < 0 : v > 0) ? "up" : "down");
      f.textContent = (v > 0 ? "+" : "") + (k === "cash" ? "¥" + v : v);
      box.appendChild(f); setTimeout(() => f.remove(), 1100);
    }
    box.classList.toggle("danger", (k === "risk" && S.risk >= 70) || (k === "cash" && S.cash < 60) || (k === "trust" && S.trust <= 20));
  }
  document.body.classList.toggle("danger", S.risk >= 70);
}
function applyFx(fx) {
  if (!fx || S.over) return {};
  const deltas = {};
  for (const k in fx) {
    if (!(k in STATS_META)) continue;
    let v = fx[k];
    if (Array.isArray(v)) v = ri(v[0], v[1]);
    if (!v) continue;
    S[k] += v;
    if (k !== "cash") S[k] = clamp(S[k], 0, STATS_META[k].max);
    deltas[k] = v;
  }
  if (S.risk >= 80) S.flags.hadRisk80 = true;
  updateStats(deltas);
  checkDeath();
  return deltas;
}
function fxHint(fx) {
  const order = ["cash", "trust", "conscience", "risk", "hype"];
  return order.filter(k => fx[k]).map(k => {
    let v = fx[k]; const mid = Array.isArray(v) ? (v[0] + v[1]) / 2 : v;
    if (!mid) return "";
    const big = Math.abs(mid) >= 12 || (k === "cash" && Math.abs(mid) >= 60);
    return STATS_META[k].i + (mid > 0 ? (big ? "↑↑" : "↑") : (big ? "↓↓" : "↓"));
  }).filter(Boolean).join("　");
}

/* ---------------- chat ---------------- */
function pushChat(text, name, cls) {
  const feed = $("chatFeed");
  if (!feed) return;
  const d = document.createElement("div");
  d.className = "chat-msg" + (cls ? " " + cls : "");
  d.innerHTML = name ? `<b>${esc(name)}：</b>${esc(text)}` : esc(text);
  feed.appendChild(d);
  while (feed.children.length > 40) feed.removeChild(feed.firstChild);
  feed.scrollTop = feed.scrollHeight;
}
function ambientChat() {
  const inCust = CS && !CS.over;
  const inMain = S && !S.over;
  if (!inCust && !inMain) return;
  if (!chance(.55)) return;
  let pool = CHAT_CALM;
  if (inCust) {
    if (CS.suspicion >= 50) pool = chance(.6) ? CHAT_SUS : CHAT_CALM;
    else if (CS.suspicion >= 30) pool = chance(.3) ? CHAT_SUS : CHAT_CALM;
  } else {
    if (S.risk >= 65) pool = chance(.7) ? CHAT_DOOM : CHAT_SUS;
    else if (S.risk >= 35) pool = chance(.5) ? CHAT_SUS : CHAT_CALM;
    if (S.flags.cbd && chance(.3)) pool = CHAT_CBD;
  }
  pushChat(pick(pool), pick(CHAT_NAMES), (inCust ? CS.suspicion >= 50 : S.risk >= 65) ? "hot" : "");
}
function startAmbient() { stopAmbient(); ambientTimer = setInterval(ambientChat, 2800); }
function stopAmbient() { if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; } stopChatQ(); }

/* ---------------- header ---------------- */
function renderHead(phaseName) {
  $("dayLabel").textContent = `第 ${S.day} 夜`;
  $("phaseChip").textContent = phaseName;
  $("placeLabel").textContent = (S.flags.cbd && S.day >= 5) ? CBD_PLACE : PLACES[S.day - 1] || PLACES[0];
  $("dayDots").innerHTML = Array.from({ length: TOTAL_DAYS }, (_, i) =>
    `<i class="${i + 1 < S.day ? "on" : i + 1 === S.day ? "now" : ""}"></i>`).join("");
  const watchNum = Math.round(S.hype * S.hype * 3.5 + 800);
  $("watchers").textContent = (watchNum < 10000 ? (watchNum / 1000).toFixed(1) + "千" : (watchNum / 10000).toFixed(1) + "万") + "人围观";
}

/* ---------------- supply phase ---------------- */
function startSupply() {
  if (S.over) return;
  busy = false;
  renderHead("进货");
  const greenOpen = S.day >= 3;
  const minLegCost = greenOpen ? COST.green : COST.duck;
  if (S.cash < STALL_FEE + minLegCost) {
    S.over = true;
    return setTimeout(() => showEnding(ENDINGS.find(e => e.id === "broke")), 600);
  }
  const gooseAvail = ri(4, 8) + (S.trust >= 70 ? 2 : 0);
  const buy = { goose: Math.min(2, gooseAvail), duck: 3, green: 0 };

  const tierHtml = PRICE_TIERS.map((p, i) => {
    const locked = p.tag === "hard" && !S.flags.cbd && S.hype < 50;
    return `<div class="price-opt ${p.v === S.price ? "sel" : ""} ${locked ? "disabled" : ""}" data-i="${i}">
      <div class="pv">¥${p.v}</div><div class="pn">${p.n}${locked ? "🔒" : ""}</div></div>`;
  }).join("");

  $("stage").innerHTML = `
  <div class="paper">
    <span class="stamp">凌晨批发市场</span>
    <div class="kicker"><span>🌅 第 ${S.day} 夜 · 进货</span><span>摊位费 ¥${STALL_FEE}/晚</span></div>
    <h2>今天，上什么腿？</h2>
    <p class="desc">${S.day === 1 ? "供应商压低声音：「<b class='hl'>鹅腿就这些，鸭腿管够。</b>你自己看着办。」" :
      greenOpen && !S.flags.greenUnlockTold ? "冷链车老板神秘兮兮：「有批<b class='hl'>特价腿，三块一只</b>。看着是有点绿，纯天然腌料，懂吧？」" :
      pick(["供应商打着哈欠卸货：「行情就这样，鹅金贵，鸭实在。」", "市场广播在喊禽类降价，只有鹅腿岿然不动。", "隔壁摊老张劝你：「别贪，卖多少进多少。」"])}</p>
    <div class="supply-row"><div class="info"><span class="le">🪿</span><div><div class="ln">鹅腿 <small style="color:#9b8a6d">¥${COST.goose}/只</small></div><div class="ld">今日限量 ${gooseAvail} 只 · 真材实料</div></div></div>
      <div class="stepper" data-leg="goose"><button data-d="-1">−</button><span class="qty" id="q-goose">${buy.goose}</span><button data-d="1">＋</button></div></div>
    <div class="supply-row"><div class="info"><span class="le">🦆</span><div><div class="ln">鸭腿 <small style="color:#9b8a6d">¥${COST.duck}/只</small></div><div class="ld">管够 · 烤上酱谁分得清</div></div></div>
      <div class="stepper" data-leg="duck"><button data-d="-1">−</button><span class="qty" id="q-duck">${buy.duck}</span><button data-d="1">＋</button></div></div>
    ${greenOpen ? `<div class="supply-row"><div class="info"><span class="le">🟢</span><div><div class="ln">翡翠腿 <small style="color:#9b8a6d">¥${COST.green}/只</small></div><div class="ld">微微发绿 · 利润惊人 · 后果自负</div></div></div>
      <div class="stepper" data-leg="green"><button data-d="-1">−</button><span class="qty" id="q-green">0</span><button data-d="1">＋</button></div></div>` : ""}
    <div class="price-opts" id="priceOpts">${tierHtml}</div>
    <div class="cost-line"><span>进货 + 摊位费</span><b id="costSum"></b></div>
    <div class="cost-line" style="margin-top:2px;font-size:12px;color:#7a6a55"><span>统一售价（不管什么腿）</span><span id="sellAt"></span></div>
    <button id="btnGo" class="btn btn-primary go-btn">🔥 出摊！</button>
    <div class="warn-line" id="supplyWarn"></div>
  </div>`;

  if (greenOpen && !S.flags.greenUnlockTold) { S.flags.greenUnlockTold = true; pushChat("听说今晚有新货？", pick(CHAT_NAMES)); }

  const maxOf = { goose: gooseAvail, duck: 30, green: 20 };
  const refresh = () => {
    const total = buy.goose * COST.goose + buy.duck * COST.duck + buy.green * COST.green + STALL_FEE;
    $("costSum").textContent = "¥" + total;
    $("sellAt").textContent = "¥" + S.price + " / 只";
    const legs = buy.goose + buy.duck + buy.green;
    $("supplyWarn").textContent = total > S.cash ? "现金不够！少进点货吧" : legs === 0 ? "一只腿都不进，出什么摊？" : "";
    $("btnGo").style.opacity = (total > S.cash || legs === 0) ? .5 : 1;
  };
  $("stage").querySelectorAll(".stepper").forEach(st => {
    const leg = st.dataset.leg;
    st.querySelectorAll("button").forEach(b => b.onclick = () => {
      AUDIO.click();
      buy[leg] = clamp(buy[leg] + (+b.dataset.d), 0, maxOf[leg]);
      $("q-" + leg).textContent = buy[leg];
      refresh();
    });
  });
  $("priceOpts").querySelectorAll(".price-opt").forEach(po => po.onclick = () => {
    AUDIO.click();
    const t = PRICE_TIERS[+po.dataset.i];
    S.price = t.v; S.priceTag = t.tag;
    $("priceOpts").querySelectorAll(".price-opt").forEach(x => x.classList.remove("sel"));
    po.classList.add("sel"); refresh();
  });
  $("btnGo").onclick = () => {
    const total = buy.goose * COST.goose + buy.duck * COST.duck + buy.green * COST.green + STALL_FEE;
    const legs = buy.goose + buy.duck + buy.green;
    if (total > S.cash || legs === 0) { AUDIO.bad(); $("stage").firstElementChild.classList.add("shake"); setTimeout(() => $("stage").firstElementChild.classList.remove("shake"), 500); return; }
    AUDIO.good();
    S.stock = { goose: buy.goose, duck: buy.duck, green: buy.green };
    applyFx({ cash: -total });
    if (S.over) return;
    startStall();
  };
  refresh();
  updateStats();
}

/* ---------------- stall phase ---------------- */
function buildQueue() {
  const n = clamp(4 + Math.floor(S.hype / 16) + (S.flags.cbd ? 2 : 0) + ri(0, 2), 4, 12);
  const basePool = S.flags.cbd && S.day >= 5 ? CBD_POOL.concat(CAMPUS.slice(0, 5)) : CAMPUS;
  let q = shuffle(basePool).slice(0, n).map(c => Object.assign({}, c));
  const returners = buildReturners();
  returners.forEach(r => q.splice(ri(0, Math.max(0, q.length - 1)), 0, r));
  if (S.day === 2) q.splice(ri(1, Math.max(1, q.length - 1)), 0, Object.assign({}, SPECIALS.vip));
  if (S.day >= 3 && chance(.3)) q.splice(ri(0, q.length - 1), 0, Object.assign({}, SPECIALS.rich));
  if (S.risk >= 45 && chance(.55)) q.splice(ri(1, q.length - 1), 0, Object.assign({}, SPECIALS.cop));
  if (S.hype >= 40 && chance(.4)) q.push(Object.assign({}, SPECIALS.scalper));
  if (S.risk >= 55 && chance(.6)) q.splice(ri(0, q.length - 1), 0, Object.assign({}, SPECIALS.owner));
  return q;
}
function startStall() {
  if (S.over) return;
  renderHead("出摊");
  S.queue = buildQueue(); S.qi = 0; S.c.nightRevenue = 0;
  startAmbient();
  startChatQ();
  pushChat(`今晚 ${("第" + S.day + "夜")} 开摊！坐标：${$("placeLabel").textContent}`, null, "sys");
  renderCustomer();
}
function dhPrice(p) { return Math.max(12, p - 12); }
function stockChips() {
  return `<div class="stock-chips">
    ${["goose", "duck", "green"].map(k => `<div class="stock-chip ${S.stock[k] === 0 ? "empty" : ""}">${LEG_EMOJI[k]} ${LEG_NAME[k]}<b>×${S.stock[k]}</b></div>`).join("")}
  </div>`;
}
function starStr(n, ch) { return n === 0 ? "❓❓❓" : ch.repeat(n); }
function renderCustomer() {
  if (S.over) return;
  busy = false;
  const c = S.queue[S.qi];
  if (!c) return endStall();
  const left = S.queue.slice(S.qi + 1).map(x => x.e).join(" ");
  const isSpecialBuy = c.kind === "scalper";
  const anyStock = S.stock.goose + S.stock.duck + S.stock.green > 0;
  const tutor = (S.day === 1 && S.qi === 0 && !S.flags.tutorialShown) ?
    `<p class="desc" style="background:#fff;border:1px dashed #d8b97f;border-radius:10px;padding:8px 10px;font-size:12.5px">🧓 隔壁老张小声教你：<b>👁 眼力</b>星越多越容易认出鸭腿；<b>★ 影响力</b>越高，捧你上天或锤你入地。遇到 <b>❓</b> 看不出深浅的，宁可说售罄。</p>` : "";
  if (tutor) S.flags.tutorialShown = true;

  const canCloseEarly = !anyStock && !isSpecialBuy && S.queue.length - S.qi > 1;
  $("stage").innerHTML = `
  ${stockChips()}
  ${canCloseEarly ? `<button class="btn btn-primary" id="btnCloseEarly" style="width:100%;margin-bottom:10px;padding:12px;font-size:15px;background:linear-gradient(135deg,#6b5a41,#4a3c2c)">🌙 腿卖完了，提前收摊（跳过剩余 ${S.queue.length - S.qi} 位）</button>` : ""}
  <div class="queue-line">${left ? "后面还排着：" + left : "队伍最后一位"}　·　第 ${S.qi + 1}/${S.queue.length} 位</div>
  <div class="paper cust-card" id="custCard">
    <div class="kicker"><span>🏮 夜市进行中 · 售价 ¥${S.price}</span><span>今晚流水 ¥${S.c.nightRevenue}</span></div>
    ${tutor}
    <div class="cust-top">
      <div class="avatar">${c.e}</div>
      <div><div class="cust-name">${esc(c.n)}${c.returning ? ' <span style="font-size:11px;color:#b4582a;border:1px solid #c96a39;border-radius:5px;padding:1px 5px;margin-left:4px">回头客</span>' : ""}</div>
        <div class="cust-badges">
          <span class="bb">★ 影响力 ${starStr(c.i, "★")}</span>
          <span class="bb">👁 眼力 ${starStr(c.y, "👁")}</span>
        </div></div>
    </div>
    <div class="cust-line">"${esc(c.l)}"</div>
    <div class="serve-btns" id="serveBtns">
      ${isSpecialBuy ? `
        <button class="serve-btn sb-goose" data-act="scalpYes">🤝 全包给他<small>清空库存 · 每只加5元</small></button>
        <button class="serve-btn sb-no" data-act="scalpNo">🙅 不卖黄牛<small>留给真排队的人</small></button>` : `
        <button class="serve-btn sb-goose" data-act="goose" ${S.stock.goose ? "" : "disabled"}>🪿 上鹅腿<small>真材实料 ¥${S.price} · 剩${S.stock.goose}</small></button>
        <button class="serve-btn sb-duck" data-act="duck" ${S.stock.duck ? "" : "disabled"}>🦆 鸭腿当鹅腿<small>照收 ¥${S.price} · 心虚 · 剩${S.stock.duck}</small></button>
        <button class="serve-btn sb-duckh" data-act="duckHonest" ${S.stock.duck ? "" : "disabled"}>🏷️ 明码卖鸭腿<small>实诚 ¥${dhPrice(S.price)} · 剩${S.stock.duck}</small></button>
        ${S.stock.green ? `<button class="serve-btn sb-green" data-act="green">🟢 上翡翠腿<small>微微发绿 ¥${S.price} · 剩${S.stock.green}</small></button>` : ""}
        <button class="serve-btn sb-no" data-act="soldout">🙇 说售罄<small>${anyStock ? "有腿也不卖" : "是真没了"}</small></button>`}
    </div>
    <div id="reactZone"></div>
  </div>`;
  if (canCloseEarly) $("btnCloseEarly").onclick = () => {
    AUDIO.click();
    const skipped = S.queue.length - S.qi;
    S.c.soldOut += skipped;
    applyFx({ trust: [-2, -1], hype: [-1, 0] });
    pushChat("今晚卖光了！后面的散了吧", pick(CHAT_NAMES), "sys");
    endStall();
  };
  $("serveBtns").querySelectorAll(".serve-btn").forEach(b => b.onclick = () => act(b.dataset.act, c));
}
function react(text, cls, then, delay) {
  $("serveBtns").style.display = "none";
  const zone = $("reactZone");
  zone.innerHTML = `<div class="reaction ${cls}" style="cursor:pointer">${text}<div style="text-align:center;font-size:11px;color:inherit;opacity:.5;margin-top:6px">点击继续 ▸</div></div>`;
  let done = false;
  const go = () => { if (done) return; done = true; then(); };
  zone.querySelector(".reaction").onclick = go;
  setTimeout(go, delay || 800);
}
function nextCustomer() { S.qi++; renderCustomer(); }

function act(action, c) {
  if (busy || S.over) return;
  busy = true;
  AUDIO.click();
  /* 黄牛 */
  if (action === "scalpYes") {
    const legs = S.stock.goose + S.stock.duck + S.stock.green;
    const gain = legs * (S.price + 5);
    S.c.duckSold += S.stock.duck; S.c.gooseSold += S.stock.goose; S.c.greenSold += S.stock.green;
    S.c.weekLegs += legs; S.c.nightRevenue += gain;
    S.stock = { goose: 0, duck: 0, green: 0 };
    applyFx({ cash: gain, trust: [-5, -3], hype: [-4, -2], conscience: [-3, -1], risk: [2, 4] });
    AUDIO.coin();
    pushChat("？？？黄牛把今晚的腿全包了？？", pick(CHAT_NAMES), "hot");
    pushChat("排了俩小时，你告诉我没了？", pick(CHAT_NAMES), "hot");
    return react(`刀哥点了 ${legs} 只腿的现金，拍拍你的肩："阿姨，痛快。明晚见。"<br>队伍后面传来此起彼伏的叹气声。`, "mid", endStall, 1000);
  }
  if (action === "scalpNo") {
    applyFx({ trust: [3, 6], conscience: [1, 3], hype: [1, 3] });
    AUDIO.good();
    pushChat("阿姨把黄牛轰走了！！帅！", pick(CHAT_NAMES));
    return react(`你摆摆手："腿是给排队的人烤的。"<br>刀哥笑了笑收起钱包："有性格。明晚我还来。"`, "ok", nextCustomer);
  }
  if (action === "soldout") {
    S.c.soldOut++;
    if (c.kind === "cop") {
      applyFx({ risk: [-6, -3] });
      return react("中年人点点头，在小本子上写了什么，转身离开。<br>你莫名觉得躲过了什么。", "ok", nextCustomer);
    }
    if (c.kind === "owner") {
      applyFx({ risk: [2, 4] });
      return react(`群主冷笑："售罄？行，我明天再来。我们群最不缺的就是耐心。"`, "mid", nextCustomer);
    }
    applyFx({ trust: c.kind === "vip" ? [-3, -1] : [-2, -1], hype: c.kind === "vip" ? [-3, -1] : [0, 0] });
    remember(c, "soldout");
    return react(pick([
      `"啊……" ${esc(c.n)}失落地看了眼炉子上滋滋作响的腿，转身走了。`,
      `${esc(c.n)}叹了口气："蹲了一晚上又没赶上。"`,
      `${esc(c.n)}小声嘀咕："那炉子上烤的是空气吗……"`]), "mid", nextCustomer);
  }
  /* 明码卖鸭腿：实诚路线 */
  if (action === "duckHonest") {
    S.stock.duck--;
    const pay = (c.kind === "rich" ? 2 : 1) * dhPrice(S.price);
    S.c.duckHonest++; S.c.weekLegs++; S.c.nightRevenue += pay;
    remember(c, "honest");
    if (c.kind === "cop") {
      applyFx({ cash: pay, risk: [-10, -6], trust: [2, 4] });
      AUDIO.good();
      return react(`他看了眼你新立的「烤鸭腿」小牌，咬了一口，亮出工作证："明码标价，挑不出毛病。"<br>登记本上多了一行：「标识规范」。`, "ok", nextCustomer);
    }
    if (c.kind === "owner") {
      applyFx({ cash: pay, risk: [-6, -3], trust: [1, 3] });
      AUDIO.good();
      return react(`群主端详了半天牌子，悻悻付钱："……行，写了鸭就是鸭。"<br>他在群里发：「今日暗访：摊主实诚，无瓜可吃。」`, "ok", nextCustomer);
    }
    const fx = { cash: pay, trust: [1, 2], conscience: [1, 2] };
    if (c.i >= 4) fx.hype = [2, 5];
    applyFx(fx);
    AUDIO.coin();
    if (c.i >= 4) pushChat(`${c.n}发了笔记：「鹅腿排不上就吃鸭腿，阿姨明码标价，实诚」`, pick(CHAT_NAMES));
    return react(pick([
      `"鸭腿也香，还便宜！" ${esc(c.n)}啃得很满足。`,
      `${esc(c.n)}看了眼「烤鸭腿」的小牌，笑了："这样挺好，不用猜。"`,
      `"实诚！" ${esc(c.n)}说下次要带全宿舍来。`]), "ok", nextCustomer, 700);
  }
  /* 上腿 */
  const leg = action;
  S.stock[leg]--;
  /* 便衣 */
  if (c.kind === "cop") {
    if (leg === "goose") {
      S.c.gooseSold++; S.c.weekLegs++; S.c.nightRevenue += S.price;
      applyFx({ cash: S.price, risk: [-14, -8], trust: [2, 4] });
      AUDIO.good();
      return react(`他吃了两口，亮出工作证："例行抽检，没问题。这腿，确实是鹅的。"<br>说完竟然又买了一只。`, "ok", nextCustomer);
    }
    S.c[leg + "Sold"]++; S.c.weekLegs++;
    applyFx({ risk: leg === "green" ? [26, 34] : [18, 26], trust: [-9, -5], hype: [5, 9] });
    AUDIO.alarm();
    shakeStage();
    pushChat("刚才那个夹克男是市监局的？！", pick(CHAT_NAMES), "hot");
    return react(`他咬了一口，慢慢放下，亮出工作证："这不是鹅腿。${leg === "green" ? "而且，它为什么是绿的？" : ""}"<br>你眼前一黑。腿钱没收，样品被带走了。`, "bad", nextCustomer, 1200);
  }
  /* 维权群群主：必盘问 */
  if (c.kind === "owner") {
    if (leg === "goose") {
      S.c.gooseSold++; S.c.weekLegs++; S.c.nightRevenue += S.price;
      applyFx({ cash: S.price, risk: [-8, -4], trust: [3, 6] });
      AUDIO.good();
      return react(`群主验了半天，悻悻付钱："……这只是真的。算你过关。"<br>他在群里发：「今日暗访：暂未发现问题。」`, "ok", nextCustomer);
    }
    return openQuiz(c, leg, true);
  }
  /* 普通/VIP/富哥 */
  if (leg === "goose") {
    S.c.gooseSold++; S.c.weekLegs++;
    const pay = c.kind === "rich" ? S.price * 2 : S.price;
    S.c.nightRevenue += pay;
    const fx = { cash: pay, trust: S.priceTag === "soft" ? [2, 3] : S.priceTag === "hard" ? [0, 1] : [1, 2], conscience: [1, 1] };
    if (c.i >= 4) fx.hype = [c.i, c.i + 3];
    if (c.returning && c.returnType === "confessed") { fx.trust = [3, 5]; fx.hype = [2, 4]; }
    applyFx(fx);
    remember(c, "goose");
    AUDIO.coin();
    if (c.i >= 4) pushChat(`${c.n} 发了测评！「真的是鹅，肉质骗不了人」`, pick(CHAT_NAMES));
    return react(c.kind === "rich" ? `他扫码付了双倍，摆摆手走了。你看着到账提醒愣了三秒。` :
      pick([`${esc(c.n)}咬了一大口，幸福地眯起眼："就是这个味！"`,
        `"真香。" ${esc(c.n)}竖起大拇指，蹲在路边开炫。`,
        `${esc(c.n)}小心翼翼捧着腿，像捧着这学期的绩点。`]), "ok", nextCustomer, 700);
  }
  /* 鸭腿/翡翠腿：识破判定 */
  const p = clamp(EYE_P[c.y] + (leg === "green" ? .28 : 0) + (S.priceTag === "hard" ? .06 : 0), 0, .95);
  if (chance(p)) return openQuiz(c, leg, false);
  /* 蒙混过关 */
  S.c[leg + "Sold"]++; S.c.weekLegs++;
  const pay = c.kind === "rich" ? S.price * 2 : S.price;
  S.c.nightRevenue += pay;
  const fx = { cash: pay, trust: [1, 2], conscience: leg === "green" ? [-5, -3] : [-3, -2], risk: leg === "green" ? [3, 5] : [1, 2] };
  if (c.i >= 4) fx.hype = [c.i + 1, c.i + 4];
  applyFx(fx);
  remember(c, "cheated");
  AUDIO.coin();
  if (c.i >= 4) pushChat(`${c.n}发笔记安利了！「人生必吃的一只腿」`, pick(CHAT_NAMES), "hot");
  if (leg === "green" && chance(.5)) pushChat("怎么感觉今天的腿色号不太对……", pick(CHAT_NAMES));
  return react(pick([
    `${esc(c.n)}毫无察觉，吃得满嘴流油："不愧是传说中的鹅腿！"`,
    `"果然名不虚传！" ${esc(c.n)}发了九宫格朋友圈。`,
    `${esc(c.n)}边吃边点头。你默默移开了视线。`]), leg === "green" ? "mid" : "ok", nextCustomer, 700);
}
function shakeStage() {
  const card = $("custCard") || $("stage").firstElementChild;
  if (card) { card.classList.add("shake"); setTimeout(() => card.classList.remove("shake"), 500); }
}

/* ---------------- quiz ---------------- */
function openQuiz(c, leg, hard) {
  AUDIO.alarm();
  const pool = QUIZZES.filter(q => (leg === "green") === !!q.green && !S.usedQuiz.includes(q.q));
  const q = pool.length ? pick(pool) : pick(QUIZZES.filter(q => (leg === "green") === !!q.green));
  S.usedQuiz.push(q.q);
  if (S.usedQuiz.length > 6) S.usedQuiz.shift();
  const opts = shuffle([["w", q.w], ["r", q.r], ["c", q.c]]);
  const root = $("modalRoot");
  root.innerHTML = `<div class="overlay"><div class="paper quiz-card">
    <div class="quiz-tag">⚡ 被盘问了！</div>
    <div class="cust-top" style="margin-bottom:10px"><div class="avatar" style="width:48px;height:48px;font-size:26px">${c.e}</div>
      <div><div class="cust-name" style="font-size:15px">${esc(c.n)}${hard ? "（来者不善）" : ""}</div>
      <div style="font-size:11px;color:#9b8a6d">影响力 ${starStr(c.i, "★")}</div></div></div>
    <div class="quiz-q">"${esc(q.q)}"</div>
    <div class="quiz-opts">${opts.map((o, idx) => `<button class="quiz-opt" data-k="${o[0]}" data-i="${idx}">${esc(o[1].t)}</button>`).join("")}</div>
  </div></div>`;
  root.querySelectorAll(".quiz-opt").forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    root.innerHTML = "";
    resolveQuiz(k, q, c, leg, hard);
  });
}
function resolveQuiz(k, q, c, leg, hard) {
  const pay = S.price;
  if (k === "w") {
    /* 妙答：化解（hard 模式有概率失效） */
    if (hard && chance(.45)) {
      S.c.quizLose++;
      applyFx({ trust: [-8, -5], risk: [12, 18], hype: [6, 10], conscience: [-2, -1] });
      AUDIO.bad(); shakeStage();
      pushChat("群主把对话录屏发群里了！", pick(CHAT_NAMES), "hot");
      return react(`${esc(q.w.t)}<br><br>群主面无表情："少来这套。"他举起手机，红点正在闪烁。`, "bad", nextCustomer, 1200);
    }
    S.c.quizWin++; S.c[leg + "Sold"]++; S.c.weekLegs++; S.c.nightRevenue += pay;
    applyFx({ cash: pay, hype: [2, 5], risk: [1, 3], conscience: [-2, -1], trust: [0, 1] });
    remember(c, "cheated");
    AUDIO.good();
    pushChat("阿姨这张嘴，去说相声屈才了", pick(CHAT_NAMES));
    return react(`你：「${esc(q.w.t)}」<br><br>${esc(q.w.r)}<br><span style="opacity:.7">（糊弄成功 +1）</span>`, "ok", nextCustomer, 1100);
  }
  if (k === "r") {
    S.c.quizLose++;
    const sev = (leg === "green" ? 4 : 0) + c.i * 2;
    applyFx({ trust: [-(6 + sev), -(3 + sev)], risk: [8 + sev, 13 + sev], hype: [4, 4 + c.i], conscience: [-2, -1] });
    remember(c, "caught");
    AUDIO.bad(); shakeStage();
    pushChat("完了，现场视频已经出来了", pick(CHAT_NAMES), "hot");
    pushChat(pick(CHAT_DOOM), pick(CHAT_NAMES), "hot");
    return react(`你：「${esc(q.r.t)}」<br><br>${esc(q.r.r)}<br><span style="opacity:.7">（这只腿没卖出去，还翻了车）</span>`, "bad", nextCustomer, 1200);
  }
  /* 坦白：部分顾客会按鸭腿价付款 */
  S.c.confess++;
  const confessPay = chance(.5) ? dhPrice(pay) : 0;
  if (confessPay) { S.c.weekLegs++; S.c.duckHonest++; S.c.nightRevenue += confessPay; }
  remember(c, "confessed");
  applyFx({ cash: confessPay, conscience: [5, 8], trust: [-3, -1], risk: [2, 4] });
  AUDIO.good();
  pushChat("阿姨居然当场承认了？？这下反而有点敬佩", pick(CHAT_NAMES));
  const confessTip = confessPay ? "（按鸭腿价收了钱。良心记住了你）" : "（退了这单。良心记住了你）";
  return react(`你：「${esc(q.c.t)}」<br><br>${esc(q.c.r)}<br><span style="opacity:.7">${confessTip}</span>`, "mid", nextCustomer, 1100);
}

/* ---------------- end of stall ---------------- */
function endStall() {
  if (S.over) return;
  stopAmbient();
  const waste = S.stock.goose + S.stock.duck + S.stock.green;
  $("stage").innerHTML = `
  <div class="paper">
    <span class="stamp">收摊小结</span>
    <div class="kicker"><span>🌙 第 ${S.day} 夜 · 打烊</span><span>${$("placeLabel").textContent}</span></div>
    <h2>炭火渐熄</h2>
    <p class="desc">${waste > 0 ? `剩下 <b class="hl">${waste} 只腿</b>没卖掉，隔夜不能要了，请隔壁老张吃了。他边啃边说：真香。` : "今晚的腿一只不剩，炉子都显得意犹未尽。"}</p>
    <div class="sum-grid">
      <div class="sum-cell">今晚流水<b>¥${S.c.nightRevenue}</b></div>
      <div class="sum-cell">本周卖出<b>${S.c.weekLegs} 只腿</b></div>
      <div class="sum-cell">鹅 / 实诚鸭 / 冒充 / 翡翠<b>${S.c.gooseSold} / ${S.c.duckHonest} / ${S.c.duckSold} / ${S.c.greenSold}</b></div>
      <div class="sum-cell">糊弄 / 翻车 / 坦白<b>${S.c.quizWin} / ${S.c.quizLose} / ${S.c.confess}</b></div>
    </div>
    <button class="btn btn-primary cont-btn" id="btnNight">🌃 深夜，舆论场开张了 →</button>
  </div>`;
  S.stock = { goose: 0, duck: 0, green: 0 };
  $("btnNight").onclick = () => { AUDIO.click(); startPublic(); };
}

/* ---------------- public opinion phase ---------------- */
function startPublic() {
  if (S.over) return;
  renderHead("舆论");
  const candidates = EVENTS.filter(ev => (!ev.once || !S.usedEvents.includes(ev.id)) && ev.cond(S));
  const maxPrio = Math.max(...candidates.map(e => e.prio));
  const ev = pick(candidates.filter(e => e.prio === maxPrio));
  S.usedEvents.push(ev.id);
  $("stage").innerHTML = `
  <div class="paper">
    <span class="stamp">深夜舆论场</span>
    <div class="kicker"><span>📱 ${ev.where}</span><span>第 ${S.day} 夜</span></div>
    <h2>${ev.title}</h2>
    <p class="desc">${ev.text}</p>
    <div class="choices">${ev.choices.map((c, i) => `
      <button class="choice" data-i="${i}">
        <div class="ct">${esc(c.t)}</div>
        <div class="ch">${esc(c.h)}</div>
        <div class="cfx">${fxHint(c.fx)}</div>
      </button>`).join("")}</div>
    <div id="evResult"></div>
  </div>`;
  $("stage").querySelectorAll(".choice").forEach(b => b.onclick = () => {
    if (busy) return; busy = true;
    AUDIO.click();
    const ch = ev.choices[+b.dataset.i];
    if (ch.flag) S.flags[ch.flag] = true;
    const before = S.cash;
    applyFx(ch.fx);
    $("stage").querySelector(".choices").style.display = "none";
    if (S.over) return;
    $("evResult").innerHTML = `
      <div class="result-box"><div class="rt">— 选择已经发生 —</div><p>${esc(ch.r)}</p></div>
      <button class="btn btn-primary cont-btn" id="btnEndDay">${S.day >= TOTAL_DAYS ? "🌅 天快亮了，这一周终于结束了 →" : "😴 睡了，明天还要进货 →"}</button>`;
    $("btnEndDay").onclick = () => { AUDIO.click(); endDay(); };
  });
  busy = false;
}

/* ---------------- day cycle / death ---------------- */
function endDay() {
  if (S.over) return;
  applyFx({ hype: -3, risk: -3 });
  if (S.over) return;
  S.day++;
  if (S.day > TOTAL_DAYS) return showEnding(finalEnding());
  startSupply();
}
function checkDeath() {
  if (S.over) return;
  const death = ENDINGS.find(e => e.death && e.check(S));
  if (death) {
    S.over = true;
    stopAmbient();
    AUDIO.alarm();
    setTimeout(() => showEnding(death), 900);
  }
}
function finalEnding() {
  return ENDINGS.find(e => !e.death && e.check(S)) || ENDINGS[ENDINGS.length - 1];
}

/* ---------------- ending ---------------- */
function unlockEnding(id) {
  const dex = JSON.parse(localStorage.getItem("zywe_dex") || "[]");
  const isNew = !dex.includes(id);
  if (isNew) { dex.push(id); localStorage.setItem("zywe_dex", JSON.stringify(dex)); }
  return isNew;
}
function showEnding(end) {
  S.over = true;
  stopAmbient();
  const isNew = unlockEnding(end.id);
  AUDIO.end();
  $("game").hidden = true;
  const badges = BADGES.filter(b => b.check(S));
  const scr = $("endingScr");
  scr.hidden = false;
  scr.innerHTML = `
  <div class="paper end-card">
    <div class="end-emoji">${end.e}</div><br>
    <span class="end-grade g-${end.grade}">${end.grade} 级结局 · 第 ${Math.min(S.day, TOTAL_DAYS)} 夜</span>
    ${isNew ? `<div class="end-new">✨ 新结局解锁！已收集 ${JSON.parse(localStorage.getItem("zywe_dex") || "[]").length}/${ENDINGS.length} 种</div>` : ""}
    <div class="end-title">${end.t}</div>
    <div class="end-sub">${end.s}</div>
    <div class="end-quote">${end.q}</div>
    <div class="end-stats">
      <div class="end-stat">最终现金<b>¥${Math.round(S.cash)}</b></div>
      <div class="end-stat">口碑<b>${Math.round(S.trust)}</b></div>
      <div class="end-stat">良心余额<b>${Math.round(S.conscience)}%</b></div>
      <div class="end-stat">🪿 鹅腿<b>${S.c.gooseSold} 只</b></div>
      <div class="end-stat">🦆 鸭腿（冒充${S.c.duckSold}）<b>${S.c.duckSold + S.c.duckHonest} 只</b></div>
      <div class="end-stat">🟢 翡翠腿<b>${S.c.greenSold} 只</b></div>
    </div>
    ${badges.length ? `<div class="badges">${badges.map(b => `<span class="badge">${b.e} ${b.t}</span>`).join("")}</div>` : ""}
    <div class="end-btns">
      <button class="btn btn-primary" id="btnShare">📋 复制战报，喊朋友来比比</button>
      <button class="btn btn-ghost" id="btnCustEnd" style="border-color:#7bb86a;color:#3a6e2a;background:#e8f4e0">🧑‍🎓 换个视角：当一回排队的人</button>
      <button class="btn btn-ghost" id="btnAgain">🔥 再摆一周</button>
      <button class="btn btn-ghost" id="btnBack">🏠 回到首页</button>
    </div>
  </div>`;
  confetti(end.grade === "S" ? ["🪿", "✨", "🍗", "🎉"] : end.grade === "C" ? ["🦆", "💧", "📉"] : ["🍗", "✨"]);
  $("btnShare").onclick = () => shareResult(end);
  $("btnCustEnd").onclick = () => { scr.hidden = true; showCustRoleSelect(); };
  $("btnAgain").onclick = () => { scr.hidden = true; startGame(); };
  $("btnBack").onclick = () => { scr.hidden = true; showLanding(); };
  unlockCustBtn();
}
function confetti(emojis) {
  for (let i = 0; i < 26; i++) {
    const s = document.createElement("span");
    s.className = "confetti";
    s.textContent = pick(emojis);
    s.style.left = ri(0, 100) + "vw";
    s.style.animationDuration = (ri(22, 42) / 10) + "s";
    s.style.animationDelay = (ri(0, 12) / 10) + "s";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 6000);
  }
}
function shareResult(end) {
  const txt = `【指鸭为鹅】我撑到了第${Math.min(S.day, TOTAL_DAYS)}夜，喜提结局——${end.e}「${end.t}」
💰最终现金 ¥${Math.round(S.cash)}｜🧡口碑 ${Math.round(S.trust)}｜😇良心余额 ${Math.round(S.conscience)}%
🪿鹅腿×${S.c.gooseSold}　🦆鸭腿×${S.c.duckSold + S.c.duckHonest}（冒充×${S.c.duckSold}）　🟢翡翠腿×${S.c.greenSold}
🗣糊弄成功${S.c.quizWin}次｜💥当场翻车${S.c.quizLose}次｜🙇坦白${S.c.confess}次
${end.q}
你能比我多活几夜？👉 ${location.href}`;
  const done = () => {
    const b = $("btnShare");
    b.textContent = "✅ 战报已复制，发群里吧！";
    setTimeout(() => { b.textContent = "📋 复制战报，喊朋友来比比"; }, 2200);
  };
  if (navigator.share) { navigator.share({ text: txt }).then(done).catch(() => copyText(txt, done)); }
  else copyText(txt, done);
}
function copyText(t, done) {
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
  else fallbackCopy(t, done);
}
function fallbackCopy(t, done) {
  const ta = document.createElement("textarea");
  ta.value = t; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e) { }
  ta.remove(); done();
}

/* ---------------- landing / dex / modals ---------------- */
const TEASERS = [
  "“上次没抢到，今天我提前两小时蹲！”",
  "“理性讨论：鹅和鸭真的吃得出来吗？”",
  "“阿姨说今晚是鹅腿，我赌一根辣条。”",
  "“蹲一个代抢，有偿，在线等。”",
  "“那个腿……你们觉不觉得有点绿？”"
];
function renderDex() {
  const dex = JSON.parse(localStorage.getItem("zywe_dex") || "[]");
  const mainIds = ENDINGS.map(e => e.id);
  const mainCount = dex.filter(id => mainIds.includes(id)).length;
  $("dexCount").textContent = `${mainCount} / ${ENDINGS.length}`;
  $("dexGrid").innerHTML = ENDINGS.map(e => dex.includes(e.id)
    ? `<div class="dex-cell"><span class="de">${e.e}</span>${e.t}</div>`
    : `<div class="dex-cell locked"><span class="de">❓</span>未解锁</div>`).join("");
}
function showLanding() {
  $("game").hidden = true; $("endingScr").hidden = true; $("landing").hidden = false;
  document.body.classList.remove("danger");
  CS = null;
  renderDex();
  const dex = JSON.parse(localStorage.getItem("zywe_dex") || "[]");
  if (dex.length > 0) unlockCustBtn();
}
const MODALS = {
  how: { t: "📖 怎么玩", b: `<ul>
    <li><b>七个夜晚</b>，三件事循环：凌晨<b>进货</b> → 晚上<b>出摊</b> → 深夜<b>舆论</b>。</li>
    <li>进货：🪿鹅腿真贵还限量，🦆鸭腿便宜管够，🟢翡翠腿利润惊人但微微发绿。</li>
    <li>出摊，每位顾客四种应对：<b>上鹅腿</b>（真材实料）、<b>鸭腿当鹅腿</b>（照收全价，心虚）、<b>明码卖鸭腿</b>（便宜12元，实诚）、<b>说售罄</b>。同一只鸭腿，撒谎多赚12块——这就是全部的问题。</li>
    <li>看顾客的 <b>👁 眼力</b>（越高越容易识破冒充）和 <b>★ 影响力</b>（捧你或锤你的力度）。被识破会触发<b>盘问三选一</b>：俏皮话能续命，嘴硬会翻车，坦白……良心会记住你。</li>
    <li>五个数值：💰现金（破产即终）🧡口碑（清零即终）😇良心 ⚠️风险（满100上热搜，直接完蛋）🔥热度（队伍更长，显微镜也更多）。</li>
    <li>撑过七夜结算结局，共 <b>14 种</b>，收集进图鉴。</li></ul>` },
  tips: { t: "🤫 老张的悄悄话", b: `<ul>
    <li>「👁 眼力满星的，别糊弄。生科院博士和带食物秤的，惹不起。」</li>
    <li>「❓ 看不出深浅的人，宁可喊售罄。我上次就是没忍住……」</li>
    <li>「盘问的时候，<b>嘴硬死得最快</b>。俏皮话看缘分，坦白看良心。」</li>
    <li>「鹅腿是真不挣钱。想又实诚又活下去？<b>明码卖鸭腿</b>，薄利多销，市监局来了都给你点头。」</li>
    <li>「口碑攒到70，供应商会偷偷多给你留几只真鹅腿。」</li>
    <li>「翡翠腿的利润是真的，半夜发光也是真的。」</li>
    <li>「热度是把双刃剑：人多了，手电筒也多了。」</li>
    <li>「想发大财就去CBD，想睡好觉就守校门。都想要？嘿嘿。」</li></ul>` },
  about: { t: "ℹ️ 关于本游戏", b: `<p style="line-height:2">《指鸭为鹅》是一款<b>纯属虚构</b>的讽刺经营小游戏。所有人物、摊位、群聊、机构均为艺术加工，与任何现实人物无关。<br><br>
    灵感来自公共新闻事件引发的网络讨论，致敬同题材作品《鹅难财》与《今天你卖的是什么腿？》。<br><br>
    它想聊的其实是：当一只腿需要靠故事来证明自己，故事就会比腿更早变凉。<br><br>请支持诚信经营。吃腿，先看品类。🪿</p>` }
};
function openModal(key) {
  const m = MODALS[key];
  const root = $("modalRoot");
  root.innerHTML = `<div class="overlay" id="ovl"><div class="paper modal-card">
    <h3>${m.t}</h3><div class="mb">${m.b}</div>
    <button class="btn modal-close" id="mClose">知道了</button></div></div>`;
  $("mClose").onclick = () => root.innerHTML = "";
  $("ovl").onclick = e => { if (e.target.id === "ovl") root.innerHTML = ""; };
}

/* ================================================================
   顾客视角模式 —— 换个角度看这只腿
   ================================================================ */
const CUST_DAYS = 5;
const CUST_ROLES = [
  { e: "🧑‍🎓", n: "你（考研党）", desc: "考研倒计时58天。你只想吃一只热乎的腿，回去背书。" },
  { e: "👩‍🎓", n: "你（美食博主）", desc: "刚开始做美食号，粉丝237个。这只腿可能是你的第一篇爆款。" },
  { e: "🤓", n: "你（生科院大一）", desc: "你在大学学的第一件事是：鹅和鸭的骨骼结构完全不同。" }
];
let CS = null; // customer state

const CUST_STATS_META = {
  wallet: { n: "钱包", i: "💸", max: 0 },
  satisfaction: { n: "饱腹感", i: "🍗", max: 100 },
  suspicion: { n: "疑心", i: "🔍", max: 100 },
  influence: { n: "影响力", i: "📱", max: 100 }
};

function newCustState(roleIdx) {
  const role = CUST_ROLES[roleIdx];
  return {
    day: 1, role: role, roleIdx: roleIdx,
    wallet: 200, satisfaction: 30, suspicion: 15, influence: roleIdx === 1 ? 35 : 10,
    stallTrust: 60, stallDuckRatio: 0,
    legsBought: 0, legsReal: 0, legsFake: 0, timesQuestioned: 0, timesPosted: 0,
    over: false, flags: {}
  };
}

function renderCustStats() {
  $("statsBar").innerHTML = Object.keys(CUST_STATS_META).map(k => {
    const m = CUST_STATS_META[k];
    return `<div class="stat s-${k}" id="stat-${k}">
      <div class="si">${m.i}</div><div class="sn">${m.n}</div>
      <div class="sv" id="sv-${k}">0</div>
      <div class="bar"><i id="sb-${k}"></i></div></div>`;
  }).join("");
}

function updateCustStats(deltas) {
  for (const k of Object.keys(CUST_STATS_META)) {
    const el = $("sv-" + k), bar = $("sb-" + k), box = $("stat-" + k);
    if (!el) continue;
    el.textContent = k === "wallet" ? "¥" + Math.round(CS[k]) : Math.round(CS[k]);
    if (bar) {
      const max = CUST_STATS_META[k].max;
      bar.style.width = max ? clamp(CS[k] / max * 100, 0, 100) + "%" : clamp(CS.wallet / 300 * 100, 2, 100) + "%";
    }
    if (deltas && deltas[k]) {
      box.classList.remove("pulse"); void box.offsetWidth; box.classList.add("pulse");
      const f = document.createElement("span");
      const v = deltas[k];
      f.className = "fly-delta " + (v > 0 ? "up" : "down");
      f.textContent = (v > 0 ? "+" : "") + (k === "wallet" ? "¥" + v : v);
      box.appendChild(f); setTimeout(() => f.remove(), 1100);
    }
  }
}

function applyCustFx(fx) {
  if (!fx || CS.over) return {};
  const deltas = {};
  for (const k in fx) {
    if (!(k in CUST_STATS_META)) continue;
    let v = fx[k];
    if (Array.isArray(v)) v = ri(v[0], v[1]);
    if (!v) continue;
    CS[k] += v;
    if (k !== "wallet") CS[k] = clamp(CS[k], 0, CUST_STATS_META[k].max);
    deltas[k] = v;
  }
  updateCustStats(deltas);
  return deltas;
}

const CUST_QUEUE_SCENES = [
  { text: "寒风里，队伍从摊位一直排到了路灯下。你裹紧羽绒服，胃在叫。前面还有<b>二十多个人</b>。", place: "校东门 · 排队中" },
  { text: "今天来得早，前面只有八个人。空气里飘着孜然和秘制酱料的味道，你的口水已经不争气了。", place: "校东门 · 排队中" },
  { text: "队伍比昨天长了一倍。有人举着手机直播排队过程，弹幕在刷「羡慕」。", place: "校西门 · 排队中" },
  { text: "你边排队边刷群。群里有人说昨天买到的腿<b>「感觉不太对」</b>。你低头看了眼摊位的招牌。", place: "校东门 · 排队中" },
  { text: "最后一天了。你特地翘了晚自习来排。队伍出奇地长——好像所有人都知道这是最后的机会。", place: "校东门 · 最后一夜" }
];

const CUST_EVENTS = [
  { day: 1, title: "第一口", scenes: [
    { text: "轮到你了。阿姨笑着递来一只热腾腾的腿：「同学，慢走啊。」你迫不及待咬了一大口。", afterBuy: true },
    { text: "肉汁在嘴里爆开——<b>好吃</b>，是真的好吃。你瞬间理解了为什么有人愿意排一个小时。" }
  ]},
  { day: 2, title: "第一个疑问", scenes: [
    { text: "刚咬两口，旁边一个戴眼镜的同学凑过来：「你有没有觉得……这骨头的弧度不太对？」" },
    { text: "你看了眼手里的腿。<b>说实话，你分不出鹅和鸭。</b>但那句话像一根刺，扎进了快乐里。" }
  ]},
  { day: 3, title: "群里炸了", scenes: [
    { text: "打开手机，群消息999+。有人发了一张对比图：<b>左边是阿姨的腿，右边是超市的鸭腿。</b>骨骼形状……好像确实挺像的。" },
    { text: "群主在征集「受害者证词」。已经有十几个人回复了。评论区两极分化：一半人说「本来就香」，一半人说「被骗了」。" }
  ]},
  { day: 4, title: "选边站", scenes: [
    { text: "事情闹大了。本地媒体来采访了几个排队的同学。<b>你的闺蜜被拍到了</b>，正举着腿说「我不在乎是什么」。" },
    { text: "你刷到了阿姨接受采访的视频。她说：「进到什么腿就写什么腿。」评论区出现了大面积的<b>「支持」</b>。" }
  ]},
  { day: 5, title: "最后一夜", scenes: [
    { text: "最后一夜。阿姨的摊前多了一块手写牌子：<b>「今日品类：鹅腿×4 / 鸭腿×若干 / 明码标价」</b>。" },
    { text: "你看着那块牌子愣了一会儿。也许从一开始，你买的就不只是一只腿——还有一个<b>关于信任的故事</b>。" }
  ]}
];

function startCustGame(roleIdx) {
  CS = newCustState(roleIdx);
  busy = false;
  $("landing").hidden = true; $("endingScr").hidden = true; $("game").hidden = false;
  renderCustStats();
  $("chatFeed").innerHTML = "";
  pushChat("今晚出摊吗？蹲一个确认！", pick(CHAT_NAMES));
  pushChat("出出出！快来排队！", pick(CHAT_NAMES));
  updateCustStats();
  custDayPhase();
}

function custDayPhase() {
  if (CS.over) return;
  const scene = CUST_QUEUE_SCENES[CS.day - 1] || CUST_QUEUE_SCENES[0];
  $("dayLabel").textContent = `第 ${CS.day} 夜`;
  $("phaseChip").textContent = "排队";
  $("placeLabel").textContent = scene.place;
  $("dayDots").innerHTML = Array.from({ length: CUST_DAYS }, (_, i) =>
    `<i class="${i + 1 < CS.day ? "on" : i + 1 === CS.day ? "now" : ""}"></i>`).join("");
  $("watchers").textContent = "";
  startAmbient();

  const price = 32 + (CS.day >= 4 ? 8 : 0);
  const isDuckDay = CS.day >= 3 && chance(.4 + CS.day * .08);
  CS.stallDuckRatio += isDuckDay ? 1 : 0;

  $("stage").innerHTML = `
  <div class="paper cust-card">
    <span class="stamp">${CS.role.e} 顾客视角</span>
    <div class="kicker"><span>🌙 第 ${CS.day} 夜</span><span>${CS.role.desc.slice(0, 20)}…</span></div>
    <h2>排到你了</h2>
    <p class="desc">${scene.text}</p>
    <div class="choices">
      <button class="choice" data-act="buy"><div class="ct">🍗 买一只（¥${price}）</div><div class="ch">排了这么久，不买对不起自己的腿。</div></button>
      <button class="choice" data-act="inspect"><div class="ct">🔍 先看看再说</div><div class="ch">凑近观察一下摊上的腿，看看能发现什么。</div></button>
      ${CS.day >= 3 ? `<button class="choice" data-act="leave"><div class="ct">🚶 算了，走了</div><div class="ch">群里的讨论让你不太放心。</div></button>` : ""}
    </div>
    <div id="evResult"></div>
  </div>`;

  $("stage").querySelectorAll(".choice").forEach(b => b.onclick = () => {
    if (busy) return; busy = true;
    AUDIO.click();
    const act = b.dataset.act;
    $("stage").querySelector(".choices").style.display = "none";

    if (act === "leave") {
      applyCustFx({ suspicion: [3, 6], satisfaction: [-8, -4] });
      pushChat("有人排到了又走了？什么情况", pick(CHAT_NAMES));
      showCustResult("你犹豫了一下，退出了队伍。身后立刻有人补了上来。<br>回宿舍的路上，你闻到了别人手里腿的香味。", () => custEveningPhase(null));
      return;
    }

    if (act === "inspect") {
      CS.timesQuestioned++;
      const spotDuck = CS.roleIdx === 2 ? chance(.7) : chance(.25 + CS.suspicion / 200);
      if (isDuckDay && spotDuck) {
        applyCustFx({ suspicion: [12, 18] });
        pushChat("那个同学在摊前看了好久", pick(CHAT_NAMES));
        showCustResult(`你蹲下来仔细看了看烤架上的腿。骨骼弧度、肌肉纹理……<b>这不像鹅腿。</b><br>阿姨注意到你的眼神，笑容僵了一秒。`, () => {
          custConfront(price, true);
        });
      } else {
        applyCustFx({ suspicion: [-2, 2] });
        showCustResult("你装作不经意地打量了一下。腿的色泽金黄，酱料均匀，看起来……挺正常的。<br>也许是群里的讨论让你想多了。", () => {
          custBuyLeg(price, isDuckDay, false);
        });
      }
      return;
    }

    /* buy */
    custBuyLeg(price, isDuckDay, false);
  });
  busy = false;
}

function custBuyLeg(price, isDuck, knewItWasDuck) {
  CS.legsBought++;
  applyCustFx({ wallet: -price, satisfaction: [15, 25] });
  if (isDuck) CS.legsFake++; else CS.legsReal++;
  AUDIO.coin();

  const ev = CUST_EVENTS[CS.day - 1];
  let narrative = ev ? ev.scenes.map(s => s.text).join("<br><br>") : "你拿着腿走到路灯下。炭火的余温透过油纸袋，暖着你的手。";

  if (isDuck && !knewItWasDuck && CS.roleIdx === 2 && chance(.5)) {
    narrative += `<br><br>你咬了第三口的时候停住了——<b>这个骨骼密度，这个肌纤维走向……</b>这不是鹅。`;
    applyCustFx({ suspicion: [10, 15] });
  }

  showCustResult(narrative, () => custEveningPhase(isDuck));
}

function custConfront(price, sawDuck) {
  $("stage").querySelector("#evResult").innerHTML = `
    <div class="result-box" style="margin-top:12px">
      <div class="rt">— 你发现了异常 —</div>
      <p>这只腿的骨骼形状和课本上的鹅完全不同。你要怎么做？</p>
    </div>
    <div class="choices" style="margin-top:10px">
      <button class="choice" data-act="confront"><div class="ct">🗣 当面问阿姨</div><div class="ch">阿姨，这腿是不是比上次小了一圈？</div></button>
      <button class="choice" data-act="buyanyway"><div class="ct">🤷 算了，好吃就行</div><div class="ch">管它鹅还是鸭，反正都是腿。</div></button>
      <button class="choice" data-act="photo"><div class="ct">📸 拍照发群里</div><div class="ch">让大家一起来鉴定。</div></button>
    </div>`;
  $("stage").querySelectorAll(".choice").forEach(b => b.onclick = () => {
    if (busy) return; busy = true;
    AUDIO.click();
    $("stage").querySelector(".choices:last-of-type").style.display = "none";
    const a = b.dataset.act;
    if (a === "confront") {
      CS.timesQuestioned++;
      const honest = chance(.4 + CS.stallTrust / 200);
      if (honest) {
        applyCustFx({ suspicion: [-5, -2], satisfaction: [5, 10], influence: [3, 6] });
        showCustResult(`阿姨沉默了两秒，小声说：「同学眼力好。今天确实是鸭腿，差价退你。」<br>你收了退款，反而对她多了几分敬意。`, () => custEveningPhase(true));
      } else {
        applyCustFx({ suspicion: [8, 14], influence: [5, 10] });
        showCustResult(`阿姨面不改色：「今年的鹅练了普拉提，比较紧致。」周围的人笑了。<br>你张了张嘴，被笑声淹没了。`, () => custEveningPhase(true));
      }
    } else if (a === "buyanyway") {
      CS.legsBought++; CS.legsFake++;
      applyCustFx({ wallet: -price, satisfaction: [10, 18], suspicion: [-3, 0] });
      AUDIO.coin();
      showCustResult("你叹了口气，付了钱。腿确实好吃。<br>也许真相没有味道重要——至少今晚是这样。", () => custEveningPhase(true));
    } else {
      CS.timesPosted++;
      applyCustFx({ influence: [12, 20], suspicion: [5, 10] });
      pushChat("有人在摊前拍照了！！", pick(CHAT_NAMES), "hot");
      showCustResult("你拍了几张特写发到群里，配文：「大家看看这个骨头。」<br>三分钟后，回复已经看不过来了。", () => custEveningPhase(null));
    }
  });
  busy = false;
}

function showCustResult(text, then) {
  const zone = $("evResult");
  zone.innerHTML = `
    <div class="result-box" style="margin-top:12px;cursor:pointer">
      <p>${text}</p>
      <div style="text-align:center;font-size:11px;color:#b4582a;opacity:.5;margin-top:6px">点击继续 ▸</div>
    </div>`;
  let done = false;
  const go = () => { if (done) return; done = true; then(); };
  zone.querySelector(".result-box").onclick = go;
  setTimeout(go, 1500);
}

function custEveningPhase(gotDuck) {
  if (CS.over) return;
  stopAmbient();
  $("phaseChip").textContent = "深夜";

  const chatMood = CS.suspicion >= 50 ? "hot" : "";
  if (gotDuck === true) pushChat("今天那批腿……有人觉得味道变了吗", pick(CHAT_NAMES), chatMood);
  else if (gotDuck === false) pushChat("今天的腿绝了！！回味无穷", pick(CHAT_NAMES));

  const choices = [];
  if (CS.legsBought > 0) {
    choices.push({ t: "📱 发一条正面评价", h: "分享快乐，也攒人气。", fx: { influence: [4, 8], satisfaction: [2, 4] }, tag: "positive" });
    if (CS.suspicion >= 30) {
      choices.push({ t: "🔬 发一条质疑帖", h: "把你的观察告诉大家。", fx: { influence: [8, 15], suspicion: [3, 6] }, tag: "negative" });
    }
  }
  choices.push({ t: "📖 不发了，回去学习", h: "考研/工作不等人。", fx: { satisfaction: [3, 5] }, tag: "silent" });
  if (CS.day >= 3 && CS.suspicion >= 40) {
    choices.push({ t: "⚖️ 加入维权群", h: "大家的力量更大。", fx: { influence: [10, 18], suspicion: [5, 8] }, tag: "weiquan" });
  }

  $("stage").innerHTML = `
  <div class="paper">
    <span class="stamp">深夜·宿舍</span>
    <div class="kicker"><span>🛏️ 回到宿舍</span><span>第 ${CS.day} 夜</span></div>
    <h2>关灯之前</h2>
    <p class="desc">${gotDuck === true
      ? "你看着手机里群聊翻涌的消息，想起今天那只腿。味道确实不错——但你总觉得少了点什么。也许是确定感。"
      : gotDuck === false
      ? "今天的腿真的很满足。你躺在床上，翻了翻群聊，大家也都在夸。"
      : "今天什么也没吃到。你翻了翻群聊，有人晒图，有人吐槽，热闹是别人的。"}</p>
    <div class="choices">${choices.map((c, i) => `
      <button class="choice" data-i="${i}"><div class="ct">${esc(c.t)}</div><div class="ch">${esc(c.h)}</div></button>`).join("")}</div>
    <div id="evResult"></div>
  </div>`;

  $("stage").querySelectorAll(".choice").forEach(b => b.onclick = () => {
    if (busy) return; busy = true;
    AUDIO.click();
    const ch = choices[+b.dataset.i];
    $("stage").querySelector(".choices").style.display = "none";
    applyCustFx(ch.fx);
    if (ch.tag === "positive") CS.timesPosted++;
    if (ch.tag === "negative") { CS.timesPosted++; CS.stallTrust -= 10; }
    if (ch.tag === "weiquan") { CS.flags.joinedWeiquan = true; CS.stallTrust -= 15; }

    const results = {
      positive: "你发了一条九宫格——金黄的腿、排队的人群、路灯下的笑脸。<br>室友凑过来：「明天我也去。」",
      negative: "你斟酌了半天措辞，发了一条「理性讨论」帖。配了骨骼对比图。<br>评论区瞬间分成两派。你关掉手机，心跳有点快。",
      silent: "你放下手机，拿起了书/电脑。有些事情不需要立刻有答案。",
      weiquan: "你被拉进了「讹腿维权群」。群公告写着：收集证据，理性维权。<br>群里已经九百多人了。你默默爬了一会儿楼。"
    };
    showCustResult(results[ch.tag] || results.silent, () => custEndDay());
  });
  busy = false;
}

function custEndDay() {
  if (CS.over) return;
  CS.stallTrust = clamp(CS.stallTrust + ri(-5, 5), 20, 90);
  CS.day++;
  if (CS.day > CUST_DAYS || CS.wallet < 20) return showCustEnding();
  custDayPhase();
}

const CUST_ENDINGS = [
  { id: "ce_truth", e: "🔬", t: "真相猎人", s: "你没有被味道说服。骨头不会说谎，你也不会。", q: "「好吃是一回事，是什么是另一回事。」", check: CS => CS.timesQuestioned >= 3 && CS.suspicion >= 50 },
  { id: "ce_loyal", e: "🧡", t: "铁杆腿粉", s: "管它鹅还是鸭，排队本身就是青春。", q: "「毕业以后，我会想念的不是腿，是排队时身边的人。」", check: CS => CS.legsBought >= 4 && CS.suspicion < 40 },
  { id: "ce_kol", e: "📱", t: "腿圈意见领袖", s: "你的帖子被转发了一万次。有人叫你「腿圈纪检委」。", q: "「我只是发了一张照片。剩下的，是互联网自己在发酵。」", check: CS => CS.influence >= 60 },
  { id: "ce_weiquan", e: "⚖️", t: "维权先锋", s: "九百人的群里，你是最活跃的那一个。", q: "「不是为了退那几十块钱。是为了不让下一个人还要猜。」", check: CS => CS.flags.joinedWeiquan },
  { id: "ce_peace", e: "🍂", t: "路灯下的普通人", s: "你排过队，吃过腿，发过一条朋友圈。然后继续过日子了。", q: "「人生没有那么多真相值得追。天冷，腿热乎，够了。」", check: () => true }
];

function showCustEnding() {
  CS.over = true;
  stopAmbient();
  const end = CUST_ENDINGS.find(e => e.check(CS)) || CUST_ENDINGS[CUST_ENDINGS.length - 1];
  unlockEnding(end.id);
  AUDIO.end();
  $("game").hidden = true;
  const scr = $("endingScr");
  scr.hidden = false;
  scr.innerHTML = `
  <div class="paper end-card">
    <div class="end-emoji">${end.e}</div><br>
    <span class="end-grade g-A">顾客结局 · 第 ${Math.min(CS.day, CUST_DAYS)} 夜</span>
    <div class="end-new">🧑‍🎓 顾客视角</div>
    <div class="end-title">${end.t}</div>
    <div class="end-sub">${end.s}</div>
    <div class="end-quote">${end.q}</div>
    <div class="end-stats">
      <div class="end-stat">剩余钱包<b>¥${Math.round(CS.wallet)}</b></div>
      <div class="end-stat">买到<b>${CS.legsBought} 只腿</b></div>
      <div class="end-stat">其中疑似鸭腿<b>${CS.legsFake} 只</b></div>
      <div class="end-stat">质疑次数<b>${CS.timesQuestioned}</b></div>
      <div class="end-stat">发帖次数<b>${CS.timesPosted}</b></div>
      <div class="end-stat">最终疑心<b>${Math.round(CS.suspicion)}%</b></div>
    </div>
    <div class="end-btns">
      <button class="btn btn-ghost" id="btnCustAgain">🧑‍🎓 换个角色再来</button>
      <button class="btn btn-ghost" id="btnBack">🏠 回到首页</button>
    </div>
  </div>`;
  confetti(["🍗", "🧑‍🎓", "✨"]);
  $("btnCustAgain").onclick = () => { scr.hidden = true; showCustRoleSelect(); };
  $("btnBack").onclick = () => { scr.hidden = true; showLanding(); };
}

function showCustRoleSelect() {
  const root = $("modalRoot");
  root.innerHTML = `<div class="overlay" id="ovl"><div class="paper modal-card">
    <h3>🧑‍🎓 选择你的身份</h3>
    <div class="mb"><p>这一次，你不是摊主——你是排队的人。<br>同一只腿，换个角度看。</p></div>
    <div class="choices">${CUST_ROLES.map((r, i) => `
      <button class="choice" data-i="${i}"><div class="ct">${r.e} ${r.n}</div><div class="ch">${r.desc}</div></button>`).join("")}</div>
  </div></div>`;
  root.querySelectorAll(".choice").forEach(b => b.onclick = () => {
    root.innerHTML = "";
    AUDIO.good();
    startCustGame(+b.dataset.i);
  });
  $("ovl").onclick = e => { if (e.target.id === "ovl") root.innerHTML = ""; };
}

function unlockCustBtn() {
  const b = $("btnCustMode");
  if (!b) return;
  b.style.opacity = "1";
  b.style.pointerEvents = "";
  b.textContent = "🧑‍🎓 换个视角：当一回排队的人";
}

/* ---------------- game start / boot ---------------- */
function startGame() {
  S = newState();
  busy = false;
  $("landing").hidden = true; $("endingScr").hidden = true; $("game").hidden = false;
  renderStatsBar();
  $("chatFeed").innerHTML = "";
  pushChat("有人知道阿姨今晚出不出摊吗？", pick(CHAT_NAMES));
  pushChat("出！刚看到三轮车出库了！", pick(CHAT_NAMES));
  updateStats();
  startSupply();
}
document.addEventListener("DOMContentLoaded", () => {
  renderDex();
  setInterval(() => { const t = $("teaser"); if (t && !$("landing").hidden) t.textContent = pick(TEASERS); }, 3200);
  $("btnStart").onclick = () => { AUDIO.ensure(); AUDIO.good(); startGame(); };
  const dex = JSON.parse(localStorage.getItem("zywe_dex") || "[]");
  if (dex.length > 0) unlockCustBtn();
  $("btnCustMode").onclick = () => { AUDIO.ensure(); AUDIO.good(); showCustRoleSelect(); };
  $("btnHelp").onclick = () => openModal("tips");
  $("btnHome").onclick = () => { if (confirm("收摊回首页？本局进度不保存哦")) { stopAmbient(); showLanding(); } };
  $("btnSound").textContent = AUDIO.on ? "🔊" : "🔇";
  $("btnSound").onclick = () => {
    AUDIO.on = !AUDIO.on;
    localStorage.setItem("zywe_snd", AUDIO.on ? "1" : "0");
    $("btnSound").textContent = AUDIO.on ? "🔊" : "🔇";
    if (AUDIO.on) AUDIO.coin();
  };
  document.querySelectorAll("[data-modal]").forEach(b => b.onclick = () => openModal(b.dataset.modal));
});
