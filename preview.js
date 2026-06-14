const fixtures = [
  { id:"m25", number:25, stage:"小组赛", round:"E组 · 第1轮", date:"6月14日 周日 · 时间待同步", a:"德国", b:"库拉索", fa:"🇩🇪", fb:"🇨🇼" },
  { id:"m26", number:26, stage:"小组赛", round:"E组 · 第1轮", date:"6月14日 周日 · 时间待同步", a:"科特迪瓦", b:"厄瓜多尔", fa:"🇨🇮", fb:"🇪🇨" },
  { id:"m27", number:27, stage:"小组赛", round:"F组 · 第1轮", date:"6月14日 周日 · 时间待同步", a:"荷兰", b:"日本", fa:"🇳🇱", fb:"🇯🇵" },
  { id:"m29", number:29, stage:"小组赛", round:"G组 · 第1轮", date:"6月15日 周一 · 时间待同步", a:"比利时", b:"埃及", fa:"🇧🇪", fb:"🇪🇬" },
  { id:"m31", number:31, stage:"小组赛", round:"H组 · 第1轮", date:"6月15日 周一 · 时间待同步", a:"西班牙", b:"佛得角", fa:"🇪🇸", fb:"🇨🇻" },
  { id:"m33", number:33, stage:"小组赛", round:"I组 · 第1轮", date:"6月16日 周二 · 时间待同步", a:"法国", b:"塞内加尔", fa:"🇫🇷", fb:"🇸🇳" },
  { id:"m35", number:35, stage:"小组赛", round:"J组 · 第1轮", date:"6月16日 周二 · 时间待同步", a:"阿根廷", b:"阿尔及利亚", fa:"🇦🇷", fb:"🇩🇿" }
];
const teams = ["墨西哥","南非","韩国","捷克","加拿大","波黑","卡塔尔","瑞士","巴西","摩洛哥","海地","苏格兰","美国","巴拉圭","澳大利亚","土耳其","德国","库拉索","科特迪瓦","厄瓜多尔","荷兰","日本","瑞典","突尼斯","比利时","埃及","伊朗","新西兰","西班牙","佛得角","沙特","乌拉圭","法国","塞内加尔","伊拉克","挪威","阿根廷","阿尔及利亚","奥地利","约旦","葡萄牙","刚果金","乌兹别克斯坦","哥伦比亚","英格兰","克罗地亚","加纳","巴拿马"];
let selected = fixtures[0];
let credits = 3;

function renderHero() {
  document.querySelector("#hero-match-number").textContent = `第 ${selected.number} 场 · ${selected.round}`;
  document.querySelector("#hero-team-a").textContent = selected.a;
  document.querySelector("#hero-team-b").textContent = selected.b;
  document.querySelector("#hero-flag-a").textContent = selected.fa;
  document.querySelector("#hero-flag-b").textContent = selected.fb;
  document.querySelector("#hero-time").textContent = selected.date;
  document.querySelectorAll(".fixture-mini-card").forEach((card) => card.classList.toggle("selected", card.dataset.id === selected.id));
}

function renderFixtures(stage = "全部") {
  const list = document.querySelector("#fixture-list");
  list.innerHTML = "";
  fixtures.filter((fixture) => stage === "全部" || fixture.stage === stage).forEach((fixture) => {
    const button = document.createElement("button");
    button.className = `fixture-mini-card${fixture.id === selected.id ? " selected" : ""}`;
    button.dataset.id = fixture.id;
    button.innerHTML = `<span class="fixture-mini-time">${fixture.date}</span><div><strong>${fixture.fa} ${fixture.a}</strong><b>VS</b><strong>${fixture.fb} ${fixture.b}</strong></div><small>${fixture.round} · 未开赛</small>`;
    button.onclick = () => { selected = fixture; renderHero(); window.scrollTo({ top: 70, behavior: "smooth" }); };
    list.appendChild(button);
  });
}

function runPrediction(teamA, teamB, custom = false) {
  if (teamA === teamB) {
    document.querySelector("#preview-error").textContent = "请选择两支不同的球队";
    return;
  }
  window.location.href = "http://localhost:8888";
}

document.querySelector("#fixture-predict").onclick = () => runPrediction(selected.a, selected.b);
document.querySelectorAll("#stage-tabs button").forEach((button) => button.onclick = () => {
  document.querySelectorAll("#stage-tabs button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  renderFixtures(button.dataset.stage);
});
const customA = document.querySelector("#custom-a");
const customB = document.querySelector("#custom-b");
teams.forEach((team) => { customA.add(new Option(team, team)); customB.add(new Option(team, team)); });
customA.value = "阿根廷"; customB.value = "西班牙";
document.querySelector("#custom-form").onsubmit = (event) => { event.preventDefault(); runPrediction(customA.value, customB.value, true); };
document.querySelectorAll("[data-open-purchase]").forEach((button) => button.onclick = () => document.querySelector("#purchase-modal").hidden = false);
document.querySelector("#close-modal").onclick = () => document.querySelector("#purchase-modal").hidden = true;
document.querySelector("#purchase-modal").onclick = (event) => { if (event.target.id === "purchase-modal") event.currentTarget.hidden = true; };
document.querySelector("#demo-redeem").onclick = () => {
  const message = document.querySelector("#redeem-message");
  if (document.querySelector("#demo-code").value.trim().toUpperCase() === "GOVA-DEMO-2026") {
    credits += 30; document.querySelector("#credits").textContent = String(credits); message.textContent = `✓ 兑换成功，当前 ${credits} 次`;
  } else message.textContent = "请输入演示码 GOVA-DEMO-2026";
};
renderFixtures();
renderHero();
