/* 별빛 등불 마법상점 · ui/tips.js
   새 기능 알림 — 기능이 처음 눈앞에 나타나는 바로 그 창 안에서 한 번만 짧게 알려 준다.
   (이미 메뉴 설명을 본 예전 저장도 새 기능을 놓치지 않게) 본 것은 S.tipSeen에 남는다. */

const FEATURE_TIPS = {
  contrib: ['⚔️', '예상 기여도', '이 손님이 이 장비를 들고 오늘 밤 원정을 가면 사명에 얼마나 보탤지 미리 셈한 값이에요. <b>숫자가 클수록 좋아요.</b> 누르면 무엇이 얼마나 더해졌는지 보여 줘요.'],
  sense: ['🛡️', '원정에 든든 · 약함', '손님도 오늘 밤 원정지에서 버틸 장비인지 따져요. <b>든든</b>하면 더 잘 사고, <b>약함</b>이면 망설여요.'],
  battle: ['🐦', '까마귀와 흥정', '<b>빠른 결판</b>은 버튼 한 번으로 끝나요. <b>중요 거래</b>(수집가·황금 손님 등)는 직접 <b>흥정 배틀</b>로 이기면 웃돈과 명성을 더 받아요. 빠른 결판만 계속 쓰면 까마귀가 버릇을 눈치채요.'],
  night: ['🌙', '밤 결산 빨리 보기', '매일 밤 결산이 길게 느껴지면 아래 <b>주요 사건만</b>이나 <b>조용한 날은 건너뛰기</b>를 눌러 보세요. 원정 장면도 끌 수 있어요. 언제든 다시 바꿀 수 있어요.'],
  special: ['✨', '특별 제작', '희귀한 장비나 특별한 주문일 때만 박자 맞추기가 나와요. 박자를 맞추면 <b>명품</b>이 잘 나오고, 귀찮으면 <b>건너뛰기</b>를 눌러도 돼요. 평소 제작은 바로 끝나요.']
};
const tipOn = id => !!(S && FEATURE_TIPS[id] && !(S.tipSeen || {})[id] && !(S.coach != null && S.coach !== 'done'));
function tipHTML(id) {
  if (!tipOn(id)) return '';
  const [ic, t, d] = FEATURE_TIPS[id];
  return `<div class="ftip" data-tip="${id}"><span class="fic">${ic}</span><div><b>새 기능 · ${t}</b><p>${d}</p></div><button class="linkbtn" data-act="tipOk" data-v="${id}">알겠어요</button></div>`;
}
function tipSeen(id) {
  S.tipSeen = { ...(S.tipSeen || {}), [id]: 1 };
}
Object.assign(ACT, {
  tipOk: v => {
    tipSeen(v);
    document.querySelectorAll(`.ftip[data-tip="${v}"]`).forEach(el => el.remove());
    save();
  }
});
