export const getUpcomingEvents = (user, partner) => {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to get next occurrence of a MM-DD date
  const getNextOccurrence = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const month = date.getMonth();
    const day = date.getDate();
    
    let nextDate = new Date(today.getFullYear(), month, day);
    if (nextDate < today) {
      nextDate.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = Math.abs(nextDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { date: nextDate, daysLeft: diffDays };
  };

  // 1. Anniversary
  if (user?.anniversaryDate) {
    const anniv = getNextOccurrence(user.anniversaryDate);
    if (anniv) {
      events.push({
        name: 'Kỷ niệm tình yêu',
        daysLeft: anniv.daysLeft,
        date: anniv.date,
        type: 'anniversary',
        icon: 'favorite'
      });
    }
  }

  // 2. Birthdays
  if (user?.birthday) {
    const bday = getNextOccurrence(user.birthday);
    if (bday) {
      events.push({
        name: `Sinh nhật ${user.displayName || 'bạn'}`,
        daysLeft: bday.daysLeft,
        date: bday.date,
        type: 'birthday',
        icon: 'cake'
      });
    }
  }

  if (partner?.birthday) {
    const bday = getNextOccurrence(partner.birthday);
    if (bday) {
      events.push({
        name: `Sinh nhật ${partner.displayName}`,
        daysLeft: bday.daysLeft,
        date: bday.date,
        type: 'birthday',
        icon: 'cake'
      });
    }
  }

  // 3. Holidays
  const holidays = [
    { name: 'Valentine', month: 1, day: 14 }, // Month is 0-indexed: 1 = Feb
    { name: 'Quốc tế Phụ Nữ', month: 2, day: 8 },
    { name: 'White Valentine', month: 2, day: 14 },
    { name: 'Phụ Nữ Việt Nam', month: 9, day: 20 },
    { name: 'Giáng sinh', month: 11, day: 25 }
  ];

  holidays.forEach(h => {
    let hDate = new Date(today.getFullYear(), h.month, h.day);
    if (hDate < today) {
      hDate.setFullYear(today.getFullYear() + 1);
    }
    const diffTime = Math.abs(hDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    events.push({
      name: h.name,
      daysLeft: diffDays,
      date: hDate,
      type: 'holiday',
      icon: 'celebration'
    });
  });

  // Sort by closest
  events.sort((a, b) => a.daysLeft - b.daysLeft);

  // Return the closest 3 events
  return events.slice(0, 3);
};
