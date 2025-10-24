import defaultLang from './lang/zh-hans.mjs';

let lang = defaultLang;
function template(str, option) {
  if (!str || !option)
    return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return option[key];
  });
}
const defaultTranslator = (...args) => {
  const [path, option] = args;
  let value;
  const array = path.split(".");
  let current = lang;
  for (let i = 0, j = array.length; i < j; i++) {
    const property = array[i];
    value = current[property];
    if (i === j - 1)
      return template(value, option);
    if (!value)
      return "";
    current = value;
  }
  return template(value, option);
};
const t = (...args) => {
  return defaultTranslator(...args);
};
const use = (l) => {
  lang = l || lang;
  if (lang.name) {
  }
};
const setLocale = use;

export { setLocale, t, use };
//# sourceMappingURL=index.mjs.map
