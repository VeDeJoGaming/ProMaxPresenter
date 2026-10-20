function presentationDisplay(displays, controlDisplayId, primaryDisplayId) {
  return displays.find(d => d.id !== controlDisplayId && d.id !== primaryDisplayId)
    || displays.find(d => d.id !== controlDisplayId)
    || null;
}
module.exports = { presentationDisplay };
