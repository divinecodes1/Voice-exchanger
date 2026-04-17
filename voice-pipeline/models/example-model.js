function createModel(options = {}) {
  const gain = Number.isFinite(options.gain) ? options.gain : 1;

  return {
    process(input) {
      const output = new Int16Array(input.length);

      for (let i = 0; i < input.length; i += 1) {
        const amplified = Math.round(input[i] * gain);
        output[i] = Math.max(-32768, Math.min(32767, amplified));
      }

      return output;
    }
  };
}

module.exports = { createModel };
