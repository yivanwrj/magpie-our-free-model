// Add real pages to the upstream React router and sidebar. The custom element
// owns its own DOM/lifecycle; no iframe, floating link or mutation observer.
export function patchConsoleNavigation(source) {
  const replace = (pattern, value) => {
    if ((source.match(pattern) ?? []).length !== 1) throw new Error('Native console navigation integration changed');
    source = source.replace(pattern, value);
  };
  replace(/(\{label:"管理",items:\[\{id:"settings",name:"服务设置",icon:)([\w$]+)(\}\]\})/g,
    '$1$2},{id:"providers",name:"渠道与模型",icon:$2},{id:"maintenance",name:"更新与健康监测",icon:$2}]}');
  replace(/settings:"服务设置",connection:"API 接入"/g,
    'settings:"服务设置",connection:"API 接入",providers:"渠道与模型",maintenance:"更新与健康监测"');
  replace(/\["overview","models","usage","channels","eac","settings","connection"\]/g,
    '["overview","models","usage","channels","eac","settings","connection","providers","maintenance"]');
  replace(/\.useState\("overview"\)/g,
    '.useState(()=>["providers","maintenance"].includes(location.hash.slice(1))?location.hash.slice(1):"overview")');
  const jsx = source.match(/([\w$]+)\.jsxs\("div",\{id:"app"/)?.[1];
  if (!jsx) throw new Error('Native console page renderer changed');
  replace(/([,;]|const )([\w$]+)=([\w$]+)&&([\w$]+)==="sponsor"\?/g,
    (_, sep, value, snapshot, page) => `${sep}${value}=${snapshot}&&(${page}==="providers"||${page}==="maintenance")?${jsx}.jsx("ofm-management",{page:${page},key:${page}}):${snapshot}&&${page}==="sponsor"?`);
  replace(/navigate:([\w$]+)=>\{([\w$]+)\.includes\(\1\)&&\(/g,
    (_, page, names) => `navigate:${page}=>{${names}.includes(${page})&&(history.replaceState(null,"",${page}==="providers"||${page}==="maintenance"?"#"+${page}:location.pathname+location.search),`);
  return source;
}
