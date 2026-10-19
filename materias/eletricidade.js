window.ELECTRICITY_BANK = (() => {
  const parts = [
    window.ELECTRICITY_PART1,
    window.ELECTRICITY_PART2,
    window.ELECTRICITY_PART3
  ];

  if (parts.some(part => !Array.isArray(part) || part.length !== 50)) {
    throw new Error('Cada bloco de Eletricidade Básica deve conter 50 questões.');
  }

  return parts.flat();
})();
