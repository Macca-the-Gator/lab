(function () {
  'use strict';

  var body = document.body;
  var currentSlug = body && body.getAttribute('data-macca-current-slug');
  if (!currentSlug) return;

  var peek = document.querySelector('[data-next-story-peek]');
  var peekClose = peek && peek.querySelector('.next-story-close');
  var article = document.querySelector('main.layout > article');
  var sentinel = document.querySelector('[data-continuous-sentinel]');
  var items = document.querySelector('[data-continuous-items]');
  var postsPromise = null;
  var loading = false;
  var loaded = new Set([currentSlug]);
  var nextIndex = -1;
  var urlObserver = null;

  function articleProgress() {
    if (!article) return 0;
    var rect = article.getBoundingClientRect();
    var travelled = Math.max(0, -rect.top + window.innerHeight * 0.25);
    return Math.min(1, travelled / Math.max(1, article.offsetHeight));
  }

  function updatePeek() {
    if (!peek || sessionStorage.getItem('macca.nextStory.dismissed') === '1') return;
    peek.classList.toggle('is-visible', articleProgress() >= 0.45);
  }

  if (peekClose) {
    peekClose.addEventListener('click', function () {
      sessionStorage.setItem('macca.nextStory.dismissed', '1');
      peek.classList.remove('is-visible');
    });
    window.addEventListener('scroll', updatePeek, { passive: true });
    updatePeek();
  }

  function posts() {
    if (!postsPromise) {
      postsPromise = fetch('/blog/posts.json', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('posts_unavailable');
          return response.json();
        })
        .then(function (value) {
          if (!Array.isArray(value)) throw new Error('posts_invalid');
          var index = value.findIndex(function (post) { return post && post.slug === currentSlug; });
          nextIndex = index >= 0 ? index + 1 : value.length;
          return value;
        });
    }
    return postsPromise;
  }

  function observeUrl(node, url, title, description) {
    if (!('IntersectionObserver' in window)) return;
    if (!urlObserver) {
      urlObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var target = entry.target;
          var nextUrl = target.getAttribute('data-continuous-url');
          var nextTitle = target.getAttribute('data-continuous-title');
          var nextDescription = target.getAttribute('data-continuous-description');
          if (nextUrl && location.pathname !== nextUrl) history.replaceState({ maccaContinuous: true }, '', nextUrl);
          if (nextTitle) document.title = nextTitle + ' | Macca Blog';
          var meta = document.querySelector('meta[name="description"]');
          if (meta && nextDescription) meta.setAttribute('content', nextDescription);
          if (peek) peek.classList.remove('is-visible');
        });
      }, { rootMargin: '-24% 0px -66% 0px', threshold: 0 });
    }
    node.setAttribute('data-continuous-url', url);
    node.setAttribute('data-continuous-title', title || '');
    node.setAttribute('data-continuous-description', description || '');
    urlObserver.observe(node);
  }

  if (article) {
    var currentTitle = document.querySelector('h1');
    var currentDescription = document.querySelector('meta[name="description"]');
    observeUrl(
      article,
      location.pathname,
      currentTitle ? currentTitle.textContent.trim() : document.title.replace(/ \| Macca Blog$/, ''),
      currentDescription ? currentDescription.content : ''
    );
  }

  function cleanFetchedArticle(doc, post) {
    var fetched = doc.querySelector('main.layout > article');
    if (!fetched) throw new Error('article_missing');
    fetched.querySelectorAll('.back, .article-related, .continuous-feed').forEach(function (node) { node.remove(); });
    fetched.classList.add('continuous-article-body');

    var wrapper = document.createElement('article');
    wrapper.className = 'continuous-article';
    wrapper.innerHTML = '<div class="continuous-divider"><span>CONTINUE READING</span></div><div class="content-panel continuous-story-break" data-content-slot="story-break" aria-label="Partner content"></div>';
    wrapper.appendChild(fetched);

    observeUrl(wrapper, '/blog/' + encodeURIComponent(post.slug) + '/', post.title, post.description);
    return wrapper;
  }

  function loadNext() {
    if (loading || !sentinel || !items) return;
    loading = true;
    sentinel.classList.add('is-loading');

    posts().then(function (allPosts) {
      while (nextIndex < allPosts.length && loaded.has(allPosts[nextIndex].slug)) nextIndex += 1;

      if (nextIndex >= allPosts.length) {
        sentinel.innerHTML = '<span>You reached the end of the current archive.</span>';
        sentinel.classList.add('is-finished');
        return null;
      }

      var post = allPosts[nextIndex++];
      loaded.add(post.slug);

      return fetch('/blog/' + encodeURIComponent(post.slug) + '/', { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) throw new Error('article_unavailable');
          return response.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var appended = cleanFetchedArticle(doc, post);
          items.appendChild(appended);
          document.dispatchEvent(new CustomEvent('macca:content-added', {detail:{root:appended}}));
          sentinel.classList.remove('is-loading');
        });
    }).catch(function () {
      sentinel.classList.remove('is-loading');
      sentinel.innerHTML = '<a href="/blog/">Browse all stories</a>';
    }).finally(function () {
      loading = false;
    });
  }

  if (sentinel && 'IntersectionObserver' in window) {
    var feedObserver = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) loadNext();
    }, { rootMargin: '0px 0px 320px 0px', threshold: 0 });
    feedObserver.observe(sentinel);
  }
}());
