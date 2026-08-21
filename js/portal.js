/**
 * INFINITYTECH — PORTAL SPLIT SCREEN INTERACTION
 */

document.addEventListener('DOMContentLoaded', () => {
  const leftPanel = document.querySelector('.split-b2c');
  const rightPanel = document.querySelector('.split-b2b');
  const wrapper = document.querySelector('.split-wrapper');

  if (leftPanel && rightPanel && wrapper) {
    leftPanel.addEventListener('mouseenter', () => {
      wrapper.classList.add('hover-left');
    });
    leftPanel.addEventListener('mouseleave', () => {
      wrapper.classList.remove('hover-left');
    });

    rightPanel.addEventListener('mouseenter', () => {
      wrapper.classList.add('hover-right');
    });
    rightPanel.addEventListener('mouseleave', () => {
      wrapper.classList.remove('hover-right');
    });
  }
});
