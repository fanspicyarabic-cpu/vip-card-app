/**
 * VIP Card App - Rewards, Daily Check-in Streak & Spin Wheel
 */

const RewardsModule = (function () {
  let currentUserId = null;
  let isSpinning = false;

  const PRIZES = [
    { label: '50 PTS', color: '#1e2330', textColor: '#facc15' },
    { label: '100 PTS', color: '#161923', textColor: '#ffffff' },
    { label: '250 PTS', color: '#2a2012', textColor: '#f59e0b' },
    { label: '500 PTS', color: '#451a03', textColor: '#fbbf24' },
    { label: '⭐ 5 XTR', color: '#0c2438', textColor: '#38bdf8' },
    { label: '⭐ 10 XTR', color: '#1e1b4b', textColor: '#a855f7' }
  ];

  function init(userId) {
    currentUserId = String(userId);
    drawWheel(0);
    renderStreakCalendar();
  }

  function drawWheel(angle) {
    const canvas = document.getElementById('spinCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const numSlices = PRIZES.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angle);

    for (let i = 0; i < numSlices; i++) {
      const slice = PRIZES[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 4, i * sliceAngle, (i + 1) * sliceAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#eab30833';
      ctx.stroke();

      // Text
      ctx.save();
      ctx.rotate(i * sliceAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = slice.textColor;
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(slice.label, radius - 20, 5);
      ctx.restore();
    }

    // Center Gold Crown Pin
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    ctx.restore();
  }

  async function spin() {
    if (isSpinning) return;
    isSpinning = true;

    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.disabled = true;

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    try {
      const res = await fetch(`/api/user/${currentUserId}/wheel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!data.success) {
        alert('Could not complete spin. Please try again.');
        isSpinning = false;
        if (spinBtn) spinBtn.disabled = false;
        return;
      }

      // Calculate target angle
      const prizeLabel = data.prize.label;
      const targetIndex = PRIZES.findIndex(p => p.label.includes(prizeLabel.split(' ')[0])) || 0;
      const sliceAngle = (2 * Math.PI) / PRIZES.length;

      // Animate spin rotation
      const totalRotations = 5;
      const endAngle = (totalRotations * 2 * Math.PI) + (3 * Math.PI / 2) - (targetIndex * sliceAngle + sliceAngle / 2);
      let currentAngle = 0;
      const duration = 3500;
      const startTime = performance.now();

      function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        currentAngle = ease * endAngle;

        drawWheel(currentAngle);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isSpinning = false;
          if (spinBtn) spinBtn.disabled = false;

          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
          }

          if (window.showToast) {
            window.showToast(`🎉 You won ${data.prize.label}!`);
          }

          // Update header points balance
          if (window.AppModule) {
            window.AppModule.updateUserHeader();
          }
        }
      }

      requestAnimationFrame(animate);

    } catch (err) {
      console.error('Spin error:', err);
      isSpinning = false;
      if (spinBtn) spinBtn.disabled = false;
    }
  }

  async function claimStreak() {
    try {
      const res = await fetch(`/api/user/${currentUserId}/streak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.success) {
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        if (window.showToast) {
          window.showToast(`🔥 Streak Day ${data.streakDays}! +${data.bonusPoints} Points awarded!`);
        }
        renderStreakCalendar(data.streakDays);
        if (window.AppModule) {
          window.AppModule.updateUserHeader();
        }
      } else {
        if (window.showToast) {
          window.showToast(`⚠️ ${data.message || 'Already claimed today!'}`);
        }
      }
    } catch (err) {
      console.error('Streak error:', err);
    }
  }

  function renderStreakCalendar(activeDay = 1) {
    const container = document.getElementById('streakCalendar');
    if (!container) return;

    let html = '';
    for (let day = 1; day <= 7; day++) {
      const isClaimed = day <= activeDay;
      const isToday = day === activeDay;
      const rewardPts = day * 20;

      html += `
        <div style="
          flex: 1;
          text-align: center;
          padding: 8px 4px;
          border-radius: 12px;
          background: ${isClaimed ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(234, 179, 8, 0.1))' : 'rgba(255, 255, 255, 0.04)'};
          border: 1px solid ${isToday ? 'var(--gold-400)' : isClaimed ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
        ">
          <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600;">DAY ${day}</div>
          <div style="font-size: 1.1rem; margin: 4px 0;">${isClaimed ? '🔥' : '🔒'}</div>
          <div style="font-size: 0.7rem; font-weight: 700; color: ${isClaimed ? 'var(--gold-300)' : 'var(--text-secondary)'};">+${rewardPts}p</div>
        </div>
      `;
    }
    container.innerHTML = html;
  }

  function shareReferralLink() {
    const botUser = 'VIPCardApp_Bot';
    const refCode = `ref_${currentUserId}`;
    const shareUrl = `https://t.me/share/url?url=https://t.me/${botUser}?start=${refCode}&text=🎁 Join VIP Card App! Get instant Binance gift cards, PUBG UC, and gaming vouchers with Telegram Stars!`;

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }

  function copyReferralLink() {
    const text = `https://t.me/VIPCardApp_Bot?start=ref_${currentUserId}`;
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast('📋 Referral link copied!');
    });
  }

  return {
    init,
    spin,
    claimStreak,
    shareReferralLink,
    copyReferralLink
  };
})();

window.RewardsModule = RewardsModule;
