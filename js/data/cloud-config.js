/* 별빛 등불 마법상점 · data/cloud-config.js
   계정 로그인 · 클라우드 저장 설정(바이라인 방식: Vercel 함수 + Upstash Redis)
   · api를 비워 두면 로그인 기능은 꺼지고, 게임은 지금처럼 이 브라우저에만 저장해요.
   · release/vercel 폴더를 Vercel에 올리면 '/api/account'로 자동으로 채워져 있어요.
   · 게임을 다른 곳(itch.io 등)에 올리고 계정 서버만 Vercel에 둘 때는 전체 주소를 넣어요.
     예: 'https://내프로젝트.vercel.app/api/account'
   자세한 방법은 docs/cloud-setup.md를 보세요. 비밀 키는 여기에 넣지 않아요(넣을 것도 없어요). */
const CLOUD_CONFIG = {
  api: '/api/account',
  // 동시 접속자 세기(관리자만 숫자를 봄). 비워 두면 신호를 보내지 않아요. Vercel 버전은 '/api/presence'.
  presence: '/api/presence'
};
