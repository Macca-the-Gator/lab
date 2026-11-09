/* Mobile navigation: enhancement only; links remain usable without JS. */
(function () {
  'use strict';
  function init() {
    var header=document.querySelector('header.top');
    if(!header || header.dataset.maccaMenuReady === '1') return;
    var nav=header.querySelector(':scope > nav');
    if(!nav) return;
    nav.id=nav.id||'macca-main-navigation';
    nav.setAttribute('aria-label',nav.getAttribute('aria-label')||'Main navigation');
    var path=location.pathname;
    nav.querySelectorAll('a[href]').forEach(function(link) {
      var u;
      try {u=new URL(link.href,location.href);}catch{return;}
      if(u.origin!==location.origin) return;
      var p=u.pathname;
      var current=p===path || (p==='/blog/' && path.startsWith('/blog/')) ||
        (p==='/gta-6/' && path.startsWith('/gta-6/'));
      if(current && !nav.querySelector('a[aria-current="page"]')) link.setAttribute('aria-current','page');
    });
    var button=document.createElement('button');
    button.type='button';
    button.className='macca-menu-toggle';
    button.setAttribute('aria-controls',nav.id);
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','Open navigation menu');
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Menu</span>';
    header.insertBefore(button,nav);
    header.dataset.maccaMenuReady='1';
    function setOpen(open){
      header.dataset.menuOpen=open?'true':'false';
      button.setAttribute('aria-expanded',String(open));
      button.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
    }
    button.addEventListener('click',function(){setOpen(header.dataset.menuOpen!=='true')});
    document.addEventListener('keydown',function(event){if(event.key==='Escape')setOpen(false)});
    document.addEventListener('click',function(event){if(!header.contains(event.target))setOpen(false)});
    nav.addEventListener('click',function(event){if(event.target.closest('a'))setOpen(false)});
    window.addEventListener('resize',function(){if(window.innerWidth>780)setOpen(false)},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
}());
