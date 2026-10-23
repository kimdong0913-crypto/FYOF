// 좋아요 애니메이션: 하트가 통통 튀고(눌렀을 때) 주위로 작은 하트 조각이 퍼진다. 취소하면 살짝 움찔.
export function likeBurst(button: HTMLElement, liked: boolean) {
  button.classList.remove("like-pop", "like-unpop");
  void button.offsetWidth; // 같은 버튼을 연달아 눌러도 애니메이션이 다시 돌게
  button.classList.add(liked ? "like-pop" : "like-unpop");
  if (!liked || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const heart = button.querySelector("svg");
  const box = (heart ?? button).getBoundingClientRect();
  const burst = document.createElement("span");
  burst.className = "like-burst";
  burst.style.left = `${box.left + box.width / 2}px`;
  burst.style.top = `${box.top + box.height / 2}px`;
  for (let i = 0; i < 8; i++) {
    const dot = document.createElement("i");
    dot.style.setProperty("--a", `${i * 45 + (i % 2 ? 10 : 0)}deg`);
    dot.style.setProperty("--d", `${i % 2 ? 22 : 30}px`);
    burst.appendChild(dot);
  }
  document.body.appendChild(burst);
  window.setTimeout(() => burst.remove(), 700);
}
