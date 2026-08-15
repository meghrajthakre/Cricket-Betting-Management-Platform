const dayStart = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export const sortMatchesForSupport = (matches, now = new Date()) => {
  const today = dayStart(now);

  return [...matches].sort((first, second) => {
    const firstTime = new Date(first.commenceTime).getTime();
    const secondTime = new Date(second.commenceTime).getTime();
    const firstValid = Number.isFinite(firstTime);
    const secondValid = Number.isFinite(secondTime);
    if (!firstValid || !secondValid) return firstValid ? -1 : secondValid ? 1 : 0;

    const firstDay = dayStart(firstTime);
    const secondDay = dayStart(secondTime);
    const bucket = (day) => day === today ? 0 : day > today ? 1 : 2;
    const firstBucket = bucket(firstDay);
    const secondBucket = bucket(secondDay);
    if (firstBucket !== secondBucket) return firstBucket - secondBucket;

    // Past unresolved matches stay below current/future matches, newest day first.
    if (firstBucket === 2 && firstDay !== secondDay) return secondDay - firstDay;
    return firstTime - secondTime;
  });
};
