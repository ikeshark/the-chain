var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, ...callbacks) {
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /*
    Adapted from https://github.com/mattdesl
    Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
    */
    function backInOut(t) {
        const s = 1.70158 * 1.525;
        if ((t *= 2) < 1)
            return 0.5 * (t * t * ((s + 1) * t - s));
        return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src/components/Tailwindcss.svelte generated by Svelte v3.17.3 */

    class Tailwindcss extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, null, safe_not_equal, {});
    	}
    }

    /* src/components/Modal.svelte generated by Svelte v3.17.3 */

    function create_fragment(ctx) {
    	let div;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	return {
    		c() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr(div, "class", "fixed top-0 left-0 z-10 flex items-center justify-center h-screen w-screen svelte-1fl4pc7");
    			attr(div, "id", "modal");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    			dispose = listen(div, "click", /*closeModal*/ ctx[0]);
    		},
    		p(ctx, [dirty]) {
    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    	function closeModal({ target }) {
    		if (target.id == "modal") {
    			dispatch("closeModal");
    		}
    	}

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	return [closeModal, dispatch, $$scope, $$slots];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    /* src/components/Welcome.svelte generated by Svelte v3.17.3 */

    function create_fragment$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");

    			div.innerHTML = `<p class="mb-4">The Chain is a motivational technique used by Jerry Seinfeld.</p> 
  <p>The only rule is don’t break the chain.</p>`;

    			attr(div, "class", "w-1/2 max-666 mx-auto bg-white p-4 svelte-15r004j");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    class Welcome extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    // ......
    // THEME
    // ......
    const themes = {
      day: {
        bg: 'bg-blue-200',
        border: 'border-gray-600',
        text: 'text-black',
        invertBg: 'bg-gray-800',
        invertBorder: 'border-gray-500',
        invertText: 'text-gray-200',
        name: 'day',
      },
      night: {
        bg: 'bg-gray-800',
        border: 'border-blue-200',
        text: 'text-blue-200',
        invertBg: 'bg-blue-200',
        invertBorder: 'border-blue-700',
        invertText: 'text-gray-800',
        name:'night'
      },
      yellow: {
        bg: 'bg-gray-900',
        border: 'border-yellow-600',
        text: 'text-yellow-400',
        invertBg: 'bg-yellow-300',
        invertBorder: 'border-gray-800',
        invertText: 'text-gray-900',
        name:'yellow'
      },
      pink: {
        bg: 'bg-gray-900',
        border: 'border-pink-700',
        text: 'text-pink-400',
        invertBg: 'bg-pink-400',
        invertBorder: 'border-pink-500',
        invertText: 'text-gray-900',
        name:'pink'
      },
    };
    // optional night invertBorder = border-gray-500
    // optional night bg = bg-blue-900
    const themeName = writable(localStorage.theme || 'night');
    const theme = derived(themeName, $themeName => themes[$themeName]);

    // ......
    // DATE
    // ......
    function formatDate(epoch) {
      const date = new Date(epoch);
      return new Date(date.setHours(0, 0, 0, 0));
    }
    const day = writable(
      localStorage.getItem('currentDay') ?
        new Date(parseInt(localStorage.currentDay)) :
        formatDate(new Date().getTime())
    );

    // .....
    // MISC
    // .....
    function createIsSubmitted() {
      const { subscribe, set, update } = writable(false);
      return {
        subscribe,
        submit: () => {
          set(true);
          setTimeout(() => set(false), 6000);
        }
      }
    }
    const isSubmitted = createIsSubmitted();

    function createToasts() {
      const { subscribe, set, update } = writable([]);
      let id = 0;
      return {
        subscribe,
        update,
        create: message => update(toasts => {
          id++;
          return [...toasts, { id, message }]
        })
      }
    }
    const toasts = createToasts();
    const badges = [365, 180, 90, 28, 14, 7, 1];

    // https://fireship.io/snippets/custom-svelte-stores/
    // https://higsch.me/2019/06/22/2019-06-21-svelte-local-storage/

    const createPersistedStore = (key, defaultValue) => {
    	const initialJson = localStorage.getItem(key);
    	const initialValue = initialJson ? JSON.parse(initialJson) : defaultValue;
    	const store = writable(initialValue);

    	const subscribe = fn =>
    		store.subscribe(current => {
    			localStorage.setItem(key, JSON.stringify(current));
    			return fn(current)
    		});

    	return {
    		subscribe,
    		set: store.set,
        update: store.update
    	}
    };
    const isFirstTime = writable(localStorage.hasVisited ? false : true);
    const currentStreak = createPersistedStore('currentStreak', 0);
    const longestStreak = createPersistedStore('longestStreak', 0);

    // ......
    // TASKS
    // ......

    const hasHistory = writable(!!localStorage.history);
    const tasks$1 = createPersistedStore('tasks', []);
    const tab = writable(localStorage.hasVisited ? 'today' : 'edit');
    function getVersion() {
      if (localStorage.chainHistory) {
        const chainHistory = JSON.parse(localStorage.chainHistory);
        return chainHistory[chainHistory.length - 1].version
      } else return 0
    }
    const version = writable(getVersion());

    /* src/components/EditChain.svelte generated by Svelte v3.17.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (88:2) {#each titles as title}
    function create_each_block(ctx) {
    	let li;
    	let span;
    	let t0_value = /*title*/ ctx[16] + "";
    	let t0;
    	let t1;
    	let button;
    	let t2;
    	let button_value_value;
    	let t3;
    	let li_class_value;
    	let dispose;

    	return {
    		c() {
    			li = element("li");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			button = element("button");
    			t2 = text("×");
    			t3 = space();
    			attr(button, "type", "button");
    			attr(button, "class", "border-0");
    			button.value = button_value_value = /*title*/ ctx[16];
    			attr(li, "class", li_class_value = "flex justify-between items-center last:mb-10 py-1 px-2 shadow-sm border " + /*$theme*/ ctx[4].border + " " + /*$theme*/ ctx[4].bg + " text-xl");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, span);
    			append(span, t0);
    			append(li, t1);
    			append(li, button);
    			append(button, t2);
    			append(li, t3);
    			dispose = listen(button, "click", /*deleteTask*/ ctx[5]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*titles*/ 1 && t0_value !== (t0_value = /*title*/ ctx[16] + "")) set_data(t0, t0_value);

    			if (dirty & /*titles*/ 1 && button_value_value !== (button_value_value = /*title*/ ctx[16])) {
    				button.value = button_value_value;
    			}

    			if (dirty & /*$theme*/ 16 && li_class_value !== (li_class_value = "flex justify-between items-center last:mb-10 py-1 px-2 shadow-sm border " + /*$theme*/ ctx[4].border + " " + /*$theme*/ ctx[4].bg + " text-xl")) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			dispose();
    		}
    	};
    }

    // (118:1) {#if titles.length}
    function create_if_block_2(ctx) {
    	let button;
    	let t0;
    	let t1_value = (/*$isFirstTime*/ ctx[3] ? "NEW" : "EDITED") + "";
    	let t1;
    	let t2;
    	let button_transition;
    	let current;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t0 = text("SUBMIT ");
    			t1 = text(t1_value);
    			t2 = text(" CHAIN");
    			attr(button, "class", "block mx-auto text-xl border-double px-2 py-1 border-4 border-blue-800 bg-blue-100");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t0);
    			append(button, t1);
    			append(button, t2);
    			current = true;
    			dispose = listen(button, "click", /*submitChain*/ ctx[7]);
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*$isFirstTime*/ 8) && t1_value !== (t1_value = (/*$isFirstTime*/ ctx[3] ? "NEW" : "EDITED") + "")) set_data(t1, t1_value);
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!button_transition) button_transition = create_bidirectional_transition(button, fade, { duration: 600, delay: 100 }, true);
    				button_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (!button_transition) button_transition = create_bidirectional_transition(button, fade, { duration: 600, delay: 100 }, false);
    			button_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (detaching && button_transition) button_transition.end();
    			dispose();
    		}
    	};
    }

    // (128:0) {#if $isFirstTime}
    function create_if_block_1(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text("What is the chain?");
    			attr(button, "class", button_class_value = "border-0 block mx-auto mt-4 text-lg italic underline " + /*$theme*/ ctx[4].text);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);
    			dispose = listen(button, "click", /*click_handler*/ ctx[14]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$theme*/ 16 && button_class_value !== (button_class_value = "border-0 block mx-auto mt-4 text-lg italic underline " + /*$theme*/ ctx[4].text)) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    // (136:0) {#if isWelcome}
    function create_if_block(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("closeModal", /*closeModal_handler*/ ctx[15]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (137:1) <Modal on:closeModal="{() => isWelcome = false}">
    function create_default_slot(ctx) {
    	let current;
    	const welcome = new Welcome({});

    	return {
    		c() {
    			create_component(welcome.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(welcome, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(welcome.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(welcome.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(welcome, detaching);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div;
    	let h2;
    	let t0_value = (/*$isFirstTime*/ ctx[3] ? "Create" : "Edit") + "";
    	let t0;
    	let t1;
    	let h2_class_value;
    	let t2;
    	let ul;
    	let ul_class_value;
    	let t3;
    	let form;
    	let label;
    	let span;
    	let t5;
    	let input;
    	let input_class_value;
    	let t6;
    	let button;
    	let form_class_value;
    	let t8;
    	let div_class_value;
    	let t9;
    	let t10;
    	let if_block2_anchor;
    	let current;
    	let dispose;
    	let each_value = /*titles*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = /*titles*/ ctx[0].length && create_if_block_2(ctx);
    	let if_block1 = /*$isFirstTime*/ ctx[3] && create_if_block_1(ctx);
    	let if_block2 = /*isWelcome*/ ctx[2] && create_if_block(ctx);

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = text(" Chain");
    			t2 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			form = element("form");
    			label = element("label");
    			span = element("span");
    			span.textContent = "New task name";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Add New Task";
    			t8 = space();
    			if (if_block0) if_block0.c();
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(h2, "class", h2_class_value = "" + (/*$theme*/ ctx[4].invertText + " text-2xl text-center"));
    			attr(ul, "id", "scroll");
    			attr(ul, "class", ul_class_value = "" + (/*$theme*/ ctx[4].text + " mb-4 overflow-y-scroll" + " svelte-1e6lje"));
    			attr(span, "class", "text-xl");
    			attr(input, "class", input_class_value = "w-full shadow-sm border-blue-300 " + /*$theme*/ ctx[4].bg);
    			attr(label, "class", "mb-2");
    			attr(button, "class", "text-black border-2 bg-white border-solid rounded-lg shadow-sm border-blue-500 px-3 py-1 block mx-auto text-xl");
    			attr(form, "class", form_class_value = "py-2 px-4 mb-4 border-2 border-solid " + /*$theme*/ ctx[4].text + " " + /*$theme*/ ctx[4].border + " " + /*$theme*/ ctx[4].bg + " shadow-sm");
    			attr(div, "class", div_class_value = "" + (/*$theme*/ ctx[4].invertBorder + " border-2 p-2 shadow-lg z-10 " + /*$theme*/ ctx[4].invertBg + " relative"));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(h2, t0);
    			append(h2, t1);
    			append(div, t2);
    			append(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append(div, t3);
    			append(div, form);
    			append(form, label);
    			append(label, span);
    			append(label, t5);
    			append(label, input);
    			set_input_value(input, /*newTitle*/ ctx[1]);
    			append(form, t6);
    			append(form, button);
    			append(div, t8);
    			if (if_block0) if_block0.m(div, null);
    			insert(target, t9, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t10, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;

    			dispose = [
    				listen(input, "input", /*input_input_handler*/ ctx[13]),
    				listen(form, "submit", prevent_default(/*addTask*/ ctx[6]))
    			];
    		},
    		p(ctx, [dirty]) {
    			if ((!current || dirty & /*$isFirstTime*/ 8) && t0_value !== (t0_value = (/*$isFirstTime*/ ctx[3] ? "Create" : "Edit") + "")) set_data(t0, t0_value);

    			if (!current || dirty & /*$theme*/ 16 && h2_class_value !== (h2_class_value = "" + (/*$theme*/ ctx[4].invertText + " text-2xl text-center"))) {
    				attr(h2, "class", h2_class_value);
    			}

    			if (dirty & /*$theme, titles, deleteTask*/ 49) {
    				each_value = /*titles*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty & /*$theme*/ 16 && ul_class_value !== (ul_class_value = "" + (/*$theme*/ ctx[4].text + " mb-4 overflow-y-scroll" + " svelte-1e6lje"))) {
    				attr(ul, "class", ul_class_value);
    			}

    			if (!current || dirty & /*$theme*/ 16 && input_class_value !== (input_class_value = "w-full shadow-sm border-blue-300 " + /*$theme*/ ctx[4].bg)) {
    				attr(input, "class", input_class_value);
    			}

    			if (dirty & /*newTitle*/ 2 && input.value !== /*newTitle*/ ctx[1]) {
    				set_input_value(input, /*newTitle*/ ctx[1]);
    			}

    			if (!current || dirty & /*$theme*/ 16 && form_class_value !== (form_class_value = "py-2 px-4 mb-4 border-2 border-solid " + /*$theme*/ ctx[4].text + " " + /*$theme*/ ctx[4].border + " " + /*$theme*/ ctx[4].bg + " shadow-sm")) {
    				attr(form, "class", form_class_value);
    			}

    			if (/*titles*/ ctx[0].length) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*$theme*/ 16 && div_class_value !== (div_class_value = "" + (/*$theme*/ ctx[4].invertBorder + " border-2 p-2 shadow-lg z-10 " + /*$theme*/ ctx[4].invertBg + " relative"))) {
    				attr(div, "class", div_class_value);
    			}

    			if (/*$isFirstTime*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(t10.parentNode, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*isWelcome*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (detaching) detach(t9);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t10);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $tasks;
    	let $isFirstTime;
    	let $version;
    	let $day;
    	let $currentStreak;
    	let $theme;
    	component_subscribe($$self, tasks$1, $$value => $$invalidate(8, $tasks = $$value));
    	component_subscribe($$self, isFirstTime, $$value => $$invalidate(3, $isFirstTime = $$value));
    	component_subscribe($$self, version, $$value => $$invalidate(9, $version = $$value));
    	component_subscribe($$self, day, $$value => $$invalidate(10, $day = $$value));
    	component_subscribe($$self, currentStreak, $$value => $$invalidate(11, $currentStreak = $$value));
    	component_subscribe($$self, theme, $$value => $$invalidate(4, $theme = $$value));
    	let titles = $tasks.map(task => task.title);
    	let newTitle = "";
    	let isWelcome = false;
    	const dispatch = createEventDispatcher();

    	function deleteTask(e) {
    		$$invalidate(0, titles = titles.filter(title => title !== e.target.value));
    	}

    	function addTask() {
    		$$invalidate(0, titles = [...titles, newTitle]);
    		$$invalidate(1, newTitle = "");
    		const scrollWrapper = document.querySelector("#scroll");

    		if (scrollWrapper.scrollHeight > scrollWrapper.clientHeight) {
    			const height = scrollWrapper.scrollHeight;
    			scrollWrapper.scrollTo({ top: height, left: 0, behavior: "smooth" });
    		}
    	}

    	function submitChain() {
    		tasks$1.set(titles.map((title, i) => {
    			return { title, id: i, isCompleted: false };
    		}));

    		let chainHistory = [];

    		if ($isFirstTime) {
    			isFirstTime.set(false);
    			localStorage.hasVisited = true;
    			version.set(1);

    			chainHistory = [
    				{
    					version: $version,
    					startDay: $day.getTime(),
    					tasks: $tasks.map(task => task.title)
    				}
    			];
    		} else if (localStorage.chainHistory) {
    			chainHistory = JSON.parse(localStorage.getItem("chainHistory"));

    			// if a chain is updated twice in a day
    			//// don't update version, overwrite tasks
    			if (chainHistory[chainHistory.length - 1].startDay === $day.getTime()) {
    				const historyItem = chainHistory[chainHistory.length - 1];
    				historyItem.tasks = $tasks.map(task => task.title);
    				chainHistory = chainHistory.filter(item => item.startDay !== $day.getTime());
    				chainHistory = [...chainHistory, historyItem];
    			} else {
    				version.update(old => {
    					let result = $currentStreak ? old + 0.01 : old + 1;
    					return parseFloat(result.toFixed(2));
    				});

    				chainHistory = [
    					...chainHistory,
    					{
    						version: $version,
    						startDay: $day.getTime(),
    						tasks: $tasks.map(task => task.title)
    					}
    				];
    			}
    		}

    		localStorage.setItem("chainHistory", JSON.stringify(chainHistory));
    		tab.set("today");
    	}

    	function input_input_handler() {
    		newTitle = this.value;
    		$$invalidate(1, newTitle);
    	}

    	const click_handler = () => $$invalidate(2, isWelcome = true);
    	const closeModal_handler = () => $$invalidate(2, isWelcome = false);

    	return [
    		titles,
    		newTitle,
    		isWelcome,
    		$isFirstTime,
    		$theme,
    		deleteTask,
    		addTask,
    		submitChain,
    		$tasks,
    		$version,
    		$day,
    		$currentStreak,
    		dispatch,
    		input_input_handler,
    		click_handler,
    		closeModal_handler
    	];
    }

    class EditChain extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/components/Confirm.svelte generated by Svelte v3.17.3 */

    function create_default_slot$1(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let button0;
    	let t5;
    	let button1;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Are you sure?";
    			t1 = space();
    			p = element("p");
    			t2 = text(/*message*/ ctx[0]);
    			t3 = space();
    			button0 = element("button");
    			button0.textContent = "Yes, I’m sure";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "ABORT";
    			attr(h2, "class", "text-2xl font-bold text-center mb-4");
    			attr(p, "class", "mb-4 text-xl");
    			attr(button0, "class", "block w-full mb-4 p-4 border-double border-8 border-green-700 rounded-lg font-bold text-xl");
    			attr(button1, "class", "block w-full mb-4 p-4 border-double border-8 border-red-700 rounded-lg font-bold text-xl");
    			attr(div, "class", "w-10/12 max-666 bg-white p-4 border-double border-black border-8 svelte-1bj0j02");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(div, t1);
    			append(div, p);
    			append(p, t2);
    			append(div, t3);
    			append(div, button0);
    			append(div, t5);
    			append(div, button1);

    			dispose = [
    				listen(button0, "click", /*confirm*/ ctx[1]),
    				listen(button1, "click", /*dismiss*/ ctx[2])
    			];
    		},
    		p(ctx, dirty) {
    			if (dirty & /*message*/ 1) set_data(t2, /*message*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("closeModal", /*dismiss*/ ctx[2]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, message*/ 17) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { message } = $$props;

    	function confirm() {
    		dispatch("confirm");
    		dispatch("dismiss");
    	}

    	function dismiss() {
    		dispatch("dismiss");
    	}

    	$$self.$set = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	return [message, confirm, dismiss];
    }

    class Confirm extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { message: 0 });
    	}
    }

    /* src/components/Today.svelte generated by Svelte v3.17.3 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i].title;
    	child_ctx[15] = list[i].id;
    	child_ctx[16] = list[i].isCompleted;
    	return child_ctx;
    }

    // (95:4) {:else}
    function create_else_block(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "All done for the day!";
    			attr(p, "class", "text-right font-bold");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (93:4) {#if tasksLeft}
    function create_if_block_4(ctx) {
    	let p;
    	let t0;
    	let t1;

    	return {
    		c() {
    			p = element("p");
    			t0 = text("Tasks left: ");
    			t1 = text(/*tasksLeft*/ ctx[2]);
    			attr(p, "class", "text-lg text-right");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t0);
    			append(p, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*tasksLeft*/ 4) set_data(t1, /*tasksLeft*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (117:5) {#if !isFuture}
    function create_if_block_2$1(ctx) {
    	let input;
    	let input_value_value;
    	let input_checked_value;
    	let t;
    	let div;
    	let div_class_value;
    	let dispose;
    	let if_block = /*isCompleted*/ ctx[16] && create_if_block_3();

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			attr(input, "class", "sr-only");
    			attr(input, "type", "checkbox");
    			input.value = input_value_value = /*id*/ ctx[15];
    			input.checked = input_checked_value = /*isCompleted*/ ctx[16];

    			attr(div, "class", div_class_value = "checkbox h-5 w-5 mr-3 border-2 flex items-center justify-center " + (/*isCompleted*/ ctx[16]
    			? `scale-lg ${/*$theme*/ ctx[8].invertBorder} ${/*$theme*/ ctx[8].invertBg} ${/*$theme*/ ctx[8].invertText}`
    			: `${/*$theme*/ ctx[8].border} ${/*$theme*/ ctx[8].bg} ${/*$theme*/ ctx[8].text}`) + " " + (/*isCompleted*/ ctx[16]
    			? /*$theme*/ ctx[8].invertBg
    			: /*$theme*/ ctx[8].bg) + " " + " svelte-tio8vd");
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			insert(target, t, anchor);
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			dispose = listen(input, "change", /*toggleComplete*/ ctx[10]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$tasks*/ 8 && input_value_value !== (input_value_value = /*id*/ ctx[15])) {
    				input.value = input_value_value;
    			}

    			if (dirty & /*$tasks*/ 8 && input_checked_value !== (input_checked_value = /*isCompleted*/ ctx[16])) {
    				input.checked = input_checked_value;
    			}

    			if (/*isCompleted*/ ctx[16]) {
    				if (!if_block) {
    					if_block = create_if_block_3();
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*$tasks, $theme*/ 264 && div_class_value !== (div_class_value = "checkbox h-5 w-5 mr-3 border-2 flex items-center justify-center " + (/*isCompleted*/ ctx[16]
    			? `scale-lg ${/*$theme*/ ctx[8].invertBorder} ${/*$theme*/ ctx[8].invertBg} ${/*$theme*/ ctx[8].invertText}`
    			: `${/*$theme*/ ctx[8].border} ${/*$theme*/ ctx[8].bg} ${/*$theme*/ ctx[8].text}`) + " " + (/*isCompleted*/ ctx[16]
    			? /*$theme*/ ctx[8].invertBg
    			: /*$theme*/ ctx[8].bg) + " " + " svelte-tio8vd")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			if (detaching) detach(t);
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    }

    // (130:5) {#if isCompleted}
    function create_if_block_3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "check w-1/2 h-full svelte-tio8vd");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (113:2) {#each $tasks as { title, id, isCompleted }}
    function create_each_block$1(ctx) {
    	let label;
    	let t0;
    	let span;
    	let t1_value = /*title*/ ctx[14] + "";
    	let t1;
    	let t2;
    	let label_class_value;
    	let if_block = !/*isFuture*/ ctx[4] && create_if_block_2$1(ctx);

    	return {
    		c() {
    			label = element("label");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr(label, "class", label_class_value = "flex items-center relative py-1 px-2 mb-1 shadow-sm border " + /*$theme*/ ctx[8].border + " " + /*$theme*/ ctx[8].text + " " + /*$theme*/ ctx[8].bg + " text-xl last:mb-12" + " svelte-tio8vd");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			if (if_block) if_block.m(label, null);
    			append(label, t0);
    			append(label, span);
    			append(span, t1);
    			append(label, t2);
    		},
    		p(ctx, dirty) {
    			if (!/*isFuture*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(label, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*$tasks*/ 8 && t1_value !== (t1_value = /*title*/ ctx[14] + "")) set_data(t1, t1_value);

    			if (dirty & /*$theme*/ 256 && label_class_value !== (label_class_value = "flex items-center relative py-1 px-2 mb-1 shadow-sm border " + /*$theme*/ ctx[8].border + " " + /*$theme*/ ctx[8].text + " " + /*$theme*/ ctx[8].bg + " text-xl last:mb-12" + " svelte-tio8vd")) {
    				attr(label, "class", label_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(label);
    			if (if_block) if_block.d();
    		}
    	};
    }

    // (140:0) {#if !isFuture}
    function create_if_block_1$1(ctx) {
    	let button;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Submit";
    			attr(button, "class", "absolute bottom-0 left-0 m-4 border-gray-800 border-solid bg-gray-200 py-1 px-3 text-2xl font-bold rounded-lg border-2");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			dispose = listen(button, "click", function () {
    				if (is_function(/*tasksLeft*/ ctx[2]
    				? /*confirmSubmit*/ ctx[11]
    				: /*submitDay*/ ctx[12])) (/*tasksLeft*/ ctx[2]
    				? /*confirmSubmit*/ ctx[11]
    				: /*submitDay*/ ctx[12]).apply(this, arguments);
    			});
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    // (149:0) {#if isConfirming}
    function create_if_block$1(ctx) {
    	let current;
    	const confirm = new Confirm({ props: { message: /*message*/ ctx[1] } });
    	confirm.$on("confirm", /*submitDay*/ ctx[12]);
    	confirm.$on("dismiss", /*dismiss_handler*/ ctx[13]);

    	return {
    		c() {
    			create_component(confirm.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(confirm, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const confirm_changes = {};
    			if (dirty & /*message*/ 2) confirm_changes.message = /*message*/ ctx[1];
    			confirm.$set(confirm_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(confirm.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(confirm.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(confirm, detaching);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let t4;
    	let t5;
    	let div1;
    	let t6;
    	let p2;
    	let t7;
    	let t8;
    	let div2_class_value;
    	let t9;
    	let div3;
    	let h2;

    	let t10_value = /*$day*/ ctx[5].toLocaleDateString("en", {
    		month: "long",
    		day: "numeric",
    		weekday: "long"
    	}) + "";

    	let t10;
    	let h2_class_value;
    	let t11;
    	let div3_class_value;
    	let t12;
    	let t13;
    	let if_block2_anchor;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*tasksLeft*/ ctx[2]) return create_if_block_4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let each_value = /*$tasks*/ ctx[3];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	let if_block1 = !/*isFuture*/ ctx[4] && create_if_block_1$1(ctx);
    	let if_block2 = /*isConfirming*/ ctx[0] && create_if_block$1(ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t0 = text("Current streak: ");
    			t1 = text(/*$currentStreak*/ ctx[6]);
    			t2 = space();
    			p1 = element("p");
    			t3 = text("Longest streak: ");
    			t4 = text(/*$longestStreak*/ ctx[7]);
    			t5 = space();
    			div1 = element("div");
    			if_block0.c();
    			t6 = space();
    			p2 = element("p");
    			t7 = text("Version: ");
    			t8 = text(/*$version*/ ctx[9]);
    			t9 = space();
    			div3 = element("div");
    			h2 = element("h2");
    			t10 = text(t10_value);
    			t11 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t12 = space();
    			if (if_block1) if_block1.c();
    			t13 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(p1, "class", "mb-4");
    			attr(div0, "class", "w-1/2");
    			attr(p2, "class", "text-right text-lg");
    			attr(div1, "class", "w-1/2");
    			attr(div2, "class", div2_class_value = "flex " + /*$theme*/ ctx[8].text + " svelte-tio8vd");
    			attr(h2, "class", h2_class_value = "text-2xl text-center mb-2 " + /*$theme*/ ctx[8].invertText + " svelte-tio8vd");
    			attr(div3, "id", "scroll");
    			attr(div3, "class", div3_class_value = "" + (/*$theme*/ ctx[8].invertBorder + " border-2 p-2 shadow-lg overflow-y-scroll " + /*$theme*/ ctx[8].invertBg + " svelte-tio8vd"));
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div0, p0);
    			append(p0, t0);
    			append(p0, t1);
    			append(div0, t2);
    			append(div0, p1);
    			append(p1, t3);
    			append(p1, t4);
    			append(div2, t5);
    			append(div2, div1);
    			if_block0.m(div1, null);
    			append(div1, t6);
    			append(div1, p2);
    			append(p2, t7);
    			append(p2, t8);
    			insert(target, t9, anchor);
    			insert(target, div3, anchor);
    			append(div3, h2);
    			append(h2, t10);
    			append(div3, t11);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			insert(target, t12, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, t13, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*$currentStreak*/ 64) set_data(t1, /*$currentStreak*/ ctx[6]);
    			if (!current || dirty & /*$longestStreak*/ 128) set_data(t4, /*$longestStreak*/ ctx[7]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, t6);
    				}
    			}

    			if (!current || dirty & /*$version*/ 512) set_data(t8, /*$version*/ ctx[9]);

    			if (!current || dirty & /*$theme*/ 256 && div2_class_value !== (div2_class_value = "flex " + /*$theme*/ ctx[8].text + " svelte-tio8vd")) {
    				attr(div2, "class", div2_class_value);
    			}

    			if ((!current || dirty & /*$day*/ 32) && t10_value !== (t10_value = /*$day*/ ctx[5].toLocaleDateString("en", {
    				month: "long",
    				day: "numeric",
    				weekday: "long"
    			}) + "")) set_data(t10, t10_value);

    			if (!current || dirty & /*$theme*/ 256 && h2_class_value !== (h2_class_value = "text-2xl text-center mb-2 " + /*$theme*/ ctx[8].invertText + " svelte-tio8vd")) {
    				attr(h2, "class", h2_class_value);
    			}

    			if (dirty & /*$theme, $tasks, toggleComplete, isFuture*/ 1304) {
    				each_value = /*$tasks*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty & /*$theme*/ 256 && div3_class_value !== (div3_class_value = "" + (/*$theme*/ ctx[8].invertBorder + " border-2 p-2 shadow-lg overflow-y-scroll " + /*$theme*/ ctx[8].invertBg + " svelte-tio8vd"))) {
    				attr(div3, "class", div3_class_value);
    			}

    			if (!/*isFuture*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(t13.parentNode, t13);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*isConfirming*/ ctx[0]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block2);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if_block0.d();
    			if (detaching) detach(t9);
    			if (detaching) detach(div3);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t12);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(t13);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $tasks;
    	let $day;
    	let $currentStreak;
    	let $longestStreak;
    	let $theme;
    	let $version;
    	component_subscribe($$self, tasks$1, $$value => $$invalidate(3, $tasks = $$value));
    	component_subscribe($$self, day, $$value => $$invalidate(5, $day = $$value));
    	component_subscribe($$self, currentStreak, $$value => $$invalidate(6, $currentStreak = $$value));
    	component_subscribe($$self, longestStreak, $$value => $$invalidate(7, $longestStreak = $$value));
    	component_subscribe($$self, theme, $$value => $$invalidate(8, $theme = $$value));
    	component_subscribe($$self, version, $$value => $$invalidate(9, $version = $$value));
    	let isConfirming = false;
    	let message = "";

    	function toggleComplete({ target }) {
    		const id = parseInt(target.value);
    		const task = $tasks[id];
    		const { isCompleted, title } = task;
    		const updatedTask = { id, isCompleted: !isCompleted, title };

    		tasks$1.update(oldTasks => {
    			let newTasks = oldTasks.filter(task => task.id !== id);
    			newTasks = [...newTasks, updatedTask];
    			newTasks.sort((a, b) => a.id - b.id);
    			return newTasks;
    		});
    	}

    	function confirmSubmit() {
    		$$invalidate(1, message = "Are you sure you want to submit an incomplete day? This will break your chain!");
    		$$invalidate(0, isConfirming = true);
    	}

    	function submitDay() {
    		const year = $day.getFullYear();
    		const month = $day.getMonth();
    		const isCompleted = tasksLeft ? false : true;
    		const value = { day: $day.getTime(), isCompleted };
    		let history = {};

    		if (localStorage.history) {
    			history = JSON.parse(localStorage.getItem("history"));
    		} else {
    			history.numRecDays = 0;
    		}

    		history.numRecDays = history.numRecDays + 1;

    		if (!history[year]) {
    			history[year] = {};
    			history[year][month] = [value];
    		} else if (!history[year][month]) {
    			history[year][month] = [value];
    		} else {
    			history[year][month] = [...history[year][month], value];
    		}

    		currentStreak.update(old => isCompleted ? old + 1 : 0);
    		day.update(d => new Date(d.setDate(d.getDate() + 1)));
    		localStorage.setItem("history", JSON.stringify(history));
    		localStorage.setItem("currentDay", $day.getTime());
    		let destination = "calendar";

    		if ($currentStreak > $longestStreak) {
    			longestStreak.set($currentStreak);

    			// if there is a new badge go to user
    			if (badges.indexOf($currentStreak) !== -1) destination = "user";
    		}

    		tasks$1.update(old => old.map(task => {
    			return { ...task, isCompleted: false };
    		}));

    		hasHistory.set(true);
    		isSubmitted.submit();
    		tab.set(destination);
    	}

    	const dismiss_handler = () => $$invalidate(0, isConfirming = false);
    	let tasksLeft;
    	let isFuture;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$tasks*/ 8) {
    			 $$invalidate(2, tasksLeft = $tasks.filter(task => task.isCompleted === false).length);
    		}

    		if ($$self.$$.dirty & /*$day*/ 32) {
    			 $$invalidate(4, isFuture = new Date().getTime() < $day.getTime());
    		}
    	};

    	return [
    		isConfirming,
    		message,
    		tasksLeft,
    		$tasks,
    		isFuture,
    		$day,
    		$currentStreak,
    		$longestStreak,
    		$theme,
    		$version,
    		toggleComplete,
    		confirmSubmit,
    		submitDay,
    		dismiss_handler
    	];
    }

    class Today extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src/components/Badges.svelte generated by Svelte v3.17.3 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (8:2) {#each myBadges as badge}
    function create_each_block$2(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t0_value = /*badge*/ ctx[4] + "";
    	let t0;
    	let span_class_value;
    	let t1;
    	let div1_class_value;

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			attr(span, "class", span_class_value = "badge w-full h-full text-5xl z-10 rounded-full text-center " + /*$theme*/ ctx[0].invertBg + " " + /*$theme*/ ctx[0].invertText + " " + /*$theme*/ ctx[0].invertBorder + " font-bold border-8 border-double" + " svelte-1m75imj");
    			attr(div0, "class", "starInner z-10 absolute top-0 left-0 w-full h-full flex items-center justify-center svelte-1m75imj");
    			attr(div1, "class", div1_class_value = "starOuter relative mx-auto h-32 w-32 my-12 " + (/*$isSubmitted*/ ctx[1] && "animate") + " svelte-1m75imj");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, span);
    			append(span, t0);
    			append(div1, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$theme*/ 1 && span_class_value !== (span_class_value = "badge w-full h-full text-5xl z-10 rounded-full text-center " + /*$theme*/ ctx[0].invertBg + " " + /*$theme*/ ctx[0].invertText + " " + /*$theme*/ ctx[0].invertBorder + " font-bold border-8 border-double" + " svelte-1m75imj")) {
    				attr(span, "class", span_class_value);
    			}

    			if (dirty & /*$isSubmitted*/ 2 && div1_class_value !== (div1_class_value = "starOuter relative mx-auto h-32 w-32 my-12 " + (/*$isSubmitted*/ ctx[1] && "animate") + " svelte-1m75imj")) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div;
    	let div_class_value;
    	let each_value = /*myBadges*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", div_class_value = "scroll overflow-y-scroll h-auto border-double border-8 " + /*$theme*/ ctx[0].border + " svelte-1m75imj");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$isSubmitted, $theme, myBadges*/ 7) {
    				each_value = /*myBadges*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$theme*/ 1 && div_class_value !== (div_class_value = "scroll overflow-y-scroll h-auto border-double border-8 " + /*$theme*/ ctx[0].border + " svelte-1m75imj")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $longestStreak;
    	let $theme;
    	let $isSubmitted;
    	component_subscribe($$self, longestStreak, $$value => $$invalidate(3, $longestStreak = $$value));
    	component_subscribe($$self, theme, $$value => $$invalidate(0, $theme = $$value));
    	component_subscribe($$self, isSubmitted, $$value => $$invalidate(1, $isSubmitted = $$value));
    	let myBadges = badges.filter(mark => $longestStreak >= mark);
    	return [$theme, $isSubmitted, myBadges];
    }

    class Badges extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* src/components/Settings.svelte generated by Svelte v3.17.3 */

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i].name;
    	child_ctx[6] = list[i].bg;
    	child_ctx[7] = list[i].border;
    	child_ctx[8] = list[i].invertBg;
    	return child_ctx;
    }

    // (34:4) {#each Object.values(themes) as { name, bg, border, invertBg }}
    function create_each_block$3(ctx) {
    	let label;
    	let t0_value = /*name*/ ctx[5] + "";
    	let t0;
    	let t1;
    	let br;
    	let t2;
    	let input;
    	let input_value_value;
    	let t3;
    	let span0;
    	let span0_class_value;
    	let t4;
    	let span1;
    	let span1_class_value;
    	let t5;
    	let label_class_value;
    	let dispose;

    	return {
    		c() {
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			span0 = element("span");
    			t4 = space();
    			span1 = element("span");
    			t5 = space();
    			attr(input, "class", "sr-only");
    			attr(input, "name", "theme");
    			attr(input, "type", "radio");
    			input.value = input_value_value = /*name*/ ctx[5];
    			attr(span0, "class", span0_class_value = "" + (/*bg*/ ctx[6] + " w-10 h-10 inline-block border border-solid border-black"));
    			attr(span1, "class", span1_class_value = "" + (/*invertBg*/ ctx[8] + " w-10 h-10 inline-block border border-solid border-black"));
    			attr(label, "class", label_class_value = "w-50 mb-1 py-1 px-4 text-center text-xl font-bold " + (theme.name === /*name*/ ctx[5] && theme.border) + " border-2 border-solid");
    		},
    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t0);
    			append(label, t1);
    			append(label, br);
    			append(label, t2);
    			append(label, input);
    			append(label, t3);
    			append(label, span0);
    			append(label, t4);
    			append(label, span1);
    			append(label, t5);
    			dispose = listen(input, "change", changeTheme);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(label);
    			dispose();
    		}
    	};
    }

    // (63:2) {#if isConfirming}
    function create_if_block$2(ctx) {
    	let current;
    	const confirm = new Confirm({ props: { message: /*message*/ ctx[1] } });
    	confirm.$on("confirm", clearStorage);
    	confirm.$on("dismiss", /*dismiss_handler*/ ctx[4]);

    	return {
    		c() {
    			create_component(confirm.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(confirm, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const confirm_changes = {};
    			if (dirty & /*message*/ 2) confirm_changes.message = /*message*/ ctx[1];
    			confirm.$set(confirm_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(confirm.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(confirm.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(confirm, detaching);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div1;
    	let h2;
    	let t0;
    	let h2_class_value;
    	let t1;
    	let form;
    	let div0;
    	let t2;
    	let button0;
    	let t3;
    	let button0_class_value;
    	let form_class_value;
    	let t4;
    	let button1;
    	let t5;
    	let button1_class_value;
    	let t6;
    	let div1_class_value;
    	let current;
    	let dispose;
    	let each_value = Object.values(themes);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	let if_block = /*isConfirming*/ ctx[0] && create_if_block$2(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			h2 = element("h2");
    			t0 = text("Themes");
    			t1 = space();
    			form = element("form");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			button0 = element("button");
    			t3 = text("Set preference");
    			t4 = space();
    			button1 = element("button");
    			t5 = text("Clear All Data");
    			t6 = space();
    			if (if_block) if_block.c();
    			attr(h2, "class", h2_class_value = "" + (/*$theme*/ ctx[2].invertText + " text-2xl text-center"));
    			attr(div0, "class", "flex flex-col flex-wrap h-48");
    			attr(button0, "class", button0_class_value = "block mx-auto my-4 p-4 text-xl font-bold border-double border-8 " + /*$theme*/ ctx[2].border);
    			attr(button0, "type", "submit");
    			attr(form, "class", form_class_value = "" + (/*$theme*/ ctx[2].text + " " + /*$theme*/ ctx[2].bg + " p-2"));
    			attr(button1, "type", "button");
    			attr(button1, "class", button1_class_value = "block mx-auto my-4 p-4 text-xl font-bold border-double border-8 border-black " + /*$theme*/ ctx[2].invertText);
    			attr(div1, "class", div1_class_value = "" + (/*$theme*/ ctx[2].invertBorder + " border-2 p-2 shadow-lg z-10 " + /*$theme*/ ctx[2].invertBg + " relative"));
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, h2);
    			append(h2, t0);
    			append(div1, t1);
    			append(div1, form);
    			append(form, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(form, t2);
    			append(form, button0);
    			append(button0, t3);
    			append(div1, t4);
    			append(div1, button1);
    			append(button1, t5);
    			append(div1, t6);
    			if (if_block) if_block.m(div1, null);
    			current = true;

    			dispose = [
    				listen(form, "submit", prevent_default(setTheme)),
    				listen(button1, "click", /*confirmDelete*/ ctx[3])
    			];
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*$theme*/ 4 && h2_class_value !== (h2_class_value = "" + (/*$theme*/ ctx[2].invertText + " text-2xl text-center"))) {
    				attr(h2, "class", h2_class_value);
    			}

    			if (dirty & /*theme, Object, themes, changeTheme*/ 0) {
    				each_value = Object.values(themes);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty & /*$theme*/ 4 && button0_class_value !== (button0_class_value = "block mx-auto my-4 p-4 text-xl font-bold border-double border-8 " + /*$theme*/ ctx[2].border)) {
    				attr(button0, "class", button0_class_value);
    			}

    			if (!current || dirty & /*$theme*/ 4 && form_class_value !== (form_class_value = "" + (/*$theme*/ ctx[2].text + " " + /*$theme*/ ctx[2].bg + " p-2"))) {
    				attr(form, "class", form_class_value);
    			}

    			if (!current || dirty & /*$theme*/ 4 && button1_class_value !== (button1_class_value = "block mx-auto my-4 p-4 text-xl font-bold border-double border-8 border-black " + /*$theme*/ ctx[2].invertText)) {
    				attr(button1, "class", button1_class_value);
    			}

    			if (/*isConfirming*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*$theme*/ 4 && div1_class_value !== (div1_class_value = "" + (/*$theme*/ ctx[2].invertBorder + " border-2 p-2 shadow-lg z-10 " + /*$theme*/ ctx[2].invertBg + " relative"))) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};
    }

    function changeTheme({ target }) {
    	themeName.set(target.value);
    }

    function setTheme({ target }) {
    	var data = new FormData(target);

    	// should i see if theme has changed?
    	localStorage.setItem("theme", data.get("theme"));

    	toasts.create("New Theme Successfully Saved");
    }

    function clearStorage() {
    	localStorage.clear();
    	location.reload();
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $theme;
    	component_subscribe($$self, theme, $$value => $$invalidate(2, $theme = $$value));
    	let isConfirming = false;
    	let message = "";

    	function confirmDelete() {
    		$$invalidate(1, message = "Are you sure you want to clear you’re data? This can’t be undone");
    		$$invalidate(0, isConfirming = true);
    	}

    	const dismiss_handler = () => $$invalidate(0, isConfirming = false);
    	return [isConfirming, message, $theme, confirmDelete, dismiss_handler];
    }

    class Settings extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* src/components/User.svelte generated by Svelte v3.17.3 */

    function create_else_block$1(ctx) {
    	let current;
    	const badges = new Badges({});

    	return {
    		c() {
    			create_component(badges.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(badges, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(badges.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(badges.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(badges, detaching);
    		}
    	};
    }

    // (25:0) {#if tab === 'settings'}
    function create_if_block$3(ctx) {
    	let current;
    	const settings = new Settings({});

    	return {
    		c() {
    			create_component(settings.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(settings, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(settings.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(settings.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(settings, detaching);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let nav;
    	let button0;
    	let t0;
    	let button0_class_value;
    	let t1;
    	let button1;
    	let t2;
    	let button1_class_value;
    	let t3;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*tab*/ ctx[0] === "settings") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			nav = element("nav");
    			button0 = element("button");
    			t0 = text("🏅");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("⚙");
    			t3 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			attr(button0, "class", button0_class_value = "menuIcon " + (/*tab*/ ctx[0] === "badges" ? "bg-white" : "bg-gray-400") + " svelte-12kkw4r");
    			attr(button0, "type", "button");
    			button0.value = "badges";

    			attr(button1, "class", button1_class_value = "menuIcon " + (/*tab*/ ctx[0] === "settings"
    			? "bg-white"
    			: "bg-gray-400") + " svelte-12kkw4r");

    			attr(button1, "type", "button");
    			button1.value = "settings";
    			attr(nav, "class", "flex justify-around -mb-1");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, button0);
    			append(button0, t0);
    			append(nav, t1);
    			append(nav, button1);
    			append(button1, t2);
    			insert(target, t3, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;

    			dispose = [
    				listen(button0, "click", /*click_handler*/ ctx[1]),
    				listen(button1, "click", /*click_handler_1*/ ctx[2])
    			];
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*tab*/ 1 && button0_class_value !== (button0_class_value = "menuIcon " + (/*tab*/ ctx[0] === "badges" ? "bg-white" : "bg-gray-400") + " svelte-12kkw4r")) {
    				attr(button0, "class", button0_class_value);
    			}

    			if (!current || dirty & /*tab*/ 1 && button1_class_value !== (button1_class_value = "menuIcon " + (/*tab*/ ctx[0] === "settings"
    			? "bg-white"
    			: "bg-gray-400") + " svelte-12kkw4r")) {
    				attr(button1, "class", button1_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(nav);
    			if (detaching) detach(t3);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    			run_all(dispose);
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let tab = "badges";
    	const click_handler = e => $$invalidate(0, tab = e.target.value);
    	const click_handler_1 = e => $$invalidate(0, tab = e.target.value);
    	return [tab, click_handler, click_handler_1];
    }

    class User extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src/components/Calendar.svelte generated by Svelte v3.17.3 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i].epoch;
    	child_ctx[28] = list[i].weekday;
    	child_ctx[29] = list[i].isCompleted;
    	child_ctx[30] = list[i].day;
    	child_ctx[32] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	child_ctx[32] = i;
    	return child_ctx;
    }

    // (184:2) {:else}
    function create_else_block_1(ctx) {
    	let h2;
    	let t;
    	let h2_class_value;

    	return {
    		c() {
    			h2 = element("h2");
    			t = text("YOU AINT GOT NO HISTORY");
    			attr(h2, "class", h2_class_value = "" + (/*$theme*/ ctx[8].text + " text-xl my-4" + " svelte-bs19i3"));
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			append(h2, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*$theme*/ 256 && h2_class_value !== (h2_class_value = "" + (/*$theme*/ ctx[8].text + " text-xl my-4" + " svelte-bs19i3"))) {
    				attr(h2, "class", h2_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    		}
    	};
    }

    // (147:2) {#if numRecDays}
    function create_if_block_1$2(ctx) {
    	let div1;
    	let h3;
    	let t0;
    	let t1;
    	let t2;
    	let h3_class_value;
    	let t3;
    	let div0;
    	let t4;
    	let div1_class_value;
    	let each_value_2 = /*weekdays*/ ctx[9];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*visibleMonth*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			div1 = element("div");
    			h3 = element("h3");
    			t0 = text(/*monthName*/ ctx[4]);
    			t1 = space();
    			t2 = text(/*year*/ ctx[0]);
    			t3 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(h3, "class", h3_class_value = "text-2xl text-center " + /*$theme*/ ctx[8].text + " svelte-bs19i3");
    			attr(div0, "class", "monthGrid mb-4 svelte-bs19i3");
    			attr(div1, "class", div1_class_value = "rounded-lg transition-sm " + (/*isAnimating*/ ctx[2] && "scale-xs") + " svelte-bs19i3");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, h3);
    			append(h3, t0);
    			append(h3, t1);
    			append(h3, t2);
    			append(div1, t3);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append(div0, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*monthName*/ 16) set_data(t0, /*monthName*/ ctx[4]);
    			if (dirty[0] & /*year*/ 1) set_data(t2, /*year*/ ctx[0]);

    			if (dirty[0] & /*$theme*/ 256 && h3_class_value !== (h3_class_value = "text-2xl text-center " + /*$theme*/ ctx[8].text + " svelte-bs19i3")) {
    				attr(h3, "class", h3_class_value);
    			}

    			if (dirty[0] & /*weekdays*/ 512) {
    				each_value_2 = /*weekdays*/ ctx[9];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, t4);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty[0] & /*visibleMonth, isCompletedStyles, showDetail, chainHistory*/ 50178) {
    				each_value_1 = /*visibleMonth*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*isAnimating*/ 4 && div1_class_value !== (div1_class_value = "rounded-lg transition-sm " + (/*isAnimating*/ ctx[2] && "scale-xs") + " svelte-bs19i3")) {
    				attr(div1, "class", div1_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (151:8) {#each weekdays as weekday, i}
    function create_each_block_2(ctx) {
    	let div;
    	let t_value = /*weekday*/ ctx[28] + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			set_style(div, "grid-column", /*i*/ ctx[32] + 1);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (170:10) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let t0_value = /*day*/ ctx[30] + "";
    	let t0;
    	let t1;
    	let span;
    	let raw_value = isCompletedContent(/*isCompleted*/ ctx[29]) + "";
    	let t2;
    	let div_id_value;
    	let div_class_value;

    	return {
    		c() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = space();
    			attr(span, "class", "block text-3xl -mt-2 md:text-2xl");
    			attr(div, "id", div_id_value = /*epoch*/ ctx[27]);
    			set_style(div, "grid-column", /*weekday*/ ctx[28] === 0 ? 7 : /*weekday*/ ctx[28]);
    			attr(div, "class", div_class_value = "text-center text-lg text-black font-bold rounded-sm " + /*isCompletedStyles*/ ctx[14](/*isCompleted*/ ctx[29], /*epoch*/ ctx[27]) + " svelte-bs19i3");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, span);
    			span.innerHTML = raw_value;
    			append(div, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*visibleMonth*/ 2 && t0_value !== (t0_value = /*day*/ ctx[30] + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*visibleMonth*/ 2 && raw_value !== (raw_value = isCompletedContent(/*isCompleted*/ ctx[29]) + "")) span.innerHTML = raw_value;
    			if (dirty[0] & /*visibleMonth*/ 2 && div_id_value !== (div_id_value = /*epoch*/ ctx[27])) {
    				attr(div, "id", div_id_value);
    			}

    			if (dirty[0] & /*visibleMonth*/ 2) {
    				set_style(div, "grid-column", /*weekday*/ ctx[28] === 0 ? 7 : /*weekday*/ ctx[28]);
    			}

    			if (dirty[0] & /*visibleMonth*/ 2 && div_class_value !== (div_class_value = "text-center text-lg text-black font-bold rounded-sm " + /*isCompletedStyles*/ ctx[14](/*isCompleted*/ ctx[29], /*epoch*/ ctx[27]) + " svelte-bs19i3")) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (158:10) {#if chainHistory.map(x => x.startDay).indexOf(epoch) !== -1}
    function create_if_block_2$2(ctx) {
    	let button;
    	let t0_value = /*day*/ ctx[30] + "";
    	let t0;
    	let t1;
    	let span;
    	let raw_value = isCompletedContent(/*isCompleted*/ ctx[29]) + "";
    	let t2;
    	let button_id_value;
    	let button_class_value;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			span = element("span");
    			t2 = space();
    			attr(span, "class", "block text-3xl -mt-2 md:text-2xl");
    			attr(button, "id", button_id_value = /*epoch*/ ctx[27]);
    			attr(button, "type", "button");
    			set_style(button, "grid-column", /*weekday*/ ctx[28] === 0 ? 7 : /*weekday*/ ctx[28]);
    			attr(button, "class", button_class_value = "hasDetail text-center relative text-lg text-black font-bold rounded-sm " + /*isCompletedStyles*/ ctx[14](/*isCompleted*/ ctx[29], /*epoch*/ ctx[27]) + " svelte-bs19i3");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t0);
    			append(button, t1);
    			append(button, span);
    			span.innerHTML = raw_value;
    			append(button, t2);
    			dispose = listen(button, "click", /*showDetail*/ ctx[15]);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*visibleMonth*/ 2 && t0_value !== (t0_value = /*day*/ ctx[30] + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*visibleMonth*/ 2 && raw_value !== (raw_value = isCompletedContent(/*isCompleted*/ ctx[29]) + "")) span.innerHTML = raw_value;
    			if (dirty[0] & /*visibleMonth*/ 2 && button_id_value !== (button_id_value = /*epoch*/ ctx[27])) {
    				attr(button, "id", button_id_value);
    			}

    			if (dirty[0] & /*visibleMonth*/ 2) {
    				set_style(button, "grid-column", /*weekday*/ ctx[28] === 0 ? 7 : /*weekday*/ ctx[28]);
    			}

    			if (dirty[0] & /*visibleMonth*/ 2 && button_class_value !== (button_class_value = "hasDetail text-center relative text-lg text-black font-bold rounded-sm " + /*isCompletedStyles*/ ctx[14](/*isCompleted*/ ctx[29], /*epoch*/ ctx[27]) + " svelte-bs19i3")) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    // (156:8) {#each visibleMonth as {epoch, weekday, isCompleted, day}
    function create_each_block_1(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (show_if == null || dirty[0] & /*visibleMonth*/ 2) show_if = !!(/*chainHistory*/ ctx[10].map(func).indexOf(/*epoch*/ ctx[27]) !== -1);
    		if (show_if) return create_if_block_2$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx, -1);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (202:0) {#if !!detail}
    function create_if_block$4(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	modal.$on("closeModal", /*closeModal*/ ctx[16]);

    	return {
    		c() {
    			create_component(modal.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty[0] & /*$theme, detail*/ 264 | dirty[1] & /*$$scope*/ 8) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};
    }

    // (209:8) {#each detail.tasks as task}
    function create_each_block$4(ctx) {
    	let li;
    	let t0_value = /*task*/ ctx[24] + "";
    	let t0;
    	let t1;
    	let li_class_value;

    	return {
    		c() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();

    			attr(li, "class", li_class_value = "" + (null_to_empty(`
            py-1 px-2 mb-1 shadow-sm
            border ${/*$theme*/ ctx[8].border}
            ${/*$theme*/ ctx[8].text} ${/*$theme*/ ctx[8].bg}
            text-xl last:mb-12
          `) + " svelte-bs19i3"));
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, t0);
    			append(li, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*detail*/ 8 && t0_value !== (t0_value = /*task*/ ctx[24] + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*$theme*/ 256 && li_class_value !== (li_class_value = "" + (null_to_empty(`
            py-1 px-2 mb-1 shadow-sm
            border ${/*$theme*/ ctx[8].border}
            ${/*$theme*/ ctx[8].text} ${/*$theme*/ ctx[8].bg}
            text-xl last:mb-12
          `) + " svelte-bs19i3"))) {
    				attr(li, "class", li_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    // (203:2) <Modal on:closeModal={closeModal}>
    function create_default_slot$2(ctx) {
    	let div;
    	let h2;
    	let t0;
    	let t1_value = /*detail*/ ctx[3].version + "";
    	let t1;
    	let h2_class_value;
    	let t2;
    	let ul;
    	let div_class_value;
    	let each_value = /*detail*/ ctx[3].tasks;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text("Version: ");
    			t1 = text(t1_value);
    			t2 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(h2, "class", h2_class_value = "text-2xl text-center mb-2 " + /*$theme*/ ctx[8].invertText + " svelte-bs19i3");
    			attr(div, "class", div_class_value = "" + (/*$theme*/ ctx[8].invertBg + " " + /*$theme*/ ctx[8].invertBorder + " border-2 p-2 shadow-lg overflow-y-scroll w-10/12 max-w-500 shadow-lg" + " svelte-bs19i3"));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(h2, t0);
    			append(h2, t1);
    			append(div, t2);
    			append(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*detail*/ 8 && t1_value !== (t1_value = /*detail*/ ctx[3].version + "")) set_data(t1, t1_value);

    			if (dirty[0] & /*$theme*/ 256 && h2_class_value !== (h2_class_value = "text-2xl text-center mb-2 " + /*$theme*/ ctx[8].invertText + " svelte-bs19i3")) {
    				attr(h2, "class", h2_class_value);
    			}

    			if (dirty[0] & /*$theme, detail*/ 264) {
    				each_value = /*detail*/ ctx[3].tasks;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*$theme*/ 256 && div_class_value !== (div_class_value = "" + (/*$theme*/ ctx[8].invertBg + " " + /*$theme*/ ctx[8].invertBorder + " border-2 p-2 shadow-lg overflow-y-scroll w-10/12 max-w-500 shadow-lg" + " svelte-bs19i3"))) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment$8(ctx) {
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let span;
    	let t2;
    	let span_class_value;
    	let t3;
    	let p_class_value;
    	let t4;
    	let div1_class_value;
    	let t5;
    	let div2;
    	let button0;
    	let t6;
    	let button0_class_value;
    	let t7;
    	let button1;
    	let t8;
    	let button1_class_value;
    	let div2_class_value;
    	let t9;
    	let if_block1_anchor;
    	let current;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*numRecDays*/ ctx[11]) return create_if_block_1$2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = !!/*detail*/ ctx[3] && create_if_block$4(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Your History";
    			t1 = space();
    			p = element("p");
    			span = element("span");
    			t2 = text(/*numRecDays*/ ctx[11]);
    			t3 = text("\n      days");
    			t4 = space();
    			if_block0.c();
    			t5 = space();
    			div2 = element("div");
    			button0 = element("button");
    			t6 = text("←");
    			t7 = space();
    			button1 = element("button");
    			t8 = text("→");
    			t9 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr(h2, "class", "text-4xl mr-8");

    			attr(span, "class", span_class_value = "" + ((/*numRecDays*/ ctx[11] > 99
    			? "text-2xl mt-2"
    			: "text-3xl") + " block -mb-3"));

    			attr(p, "class", p_class_value = "" + (/*$theme*/ ctx[8].invertBg + " " + /*$theme*/ ctx[8].invertText + " rounded-full shadow w-16 h-16 text-sm relative halo " + (/*$isSubmitted*/ ctx[7] && "animateRotate") + " svelte-bs19i3"));
    			attr(div0, "class", "flex justify-center items-center");
    			attr(div1, "class", div1_class_value = "" + (/*$theme*/ ctx[8].text + " text-center" + " svelte-bs19i3"));
    			attr(button0, "class", button0_class_value = "px-2 py-1 font-bold text-2xl border-white mr-6 " + (!/*isPrevMonth*/ ctx[5] && "invisible") + " svelte-bs19i3");
    			attr(button1, "class", button1_class_value = "px-2 py-1 font-bold text-2xl border-white " + (!/*isNextMonth*/ ctx[6] && "invisible") + " svelte-bs19i3");
    			attr(div2, "class", div2_class_value = "absolute bottom-0 mb-1 pageBtns " + /*$theme*/ ctx[8].text + " svelte-bs19i3");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, h2);
    			append(div0, t1);
    			append(div0, p);
    			append(p, span);
    			append(span, t2);
    			append(p, t3);
    			append(div1, t4);
    			if_block0.m(div1, null);
    			insert(target, t5, anchor);
    			insert(target, div2, anchor);
    			append(div2, button0);
    			append(button0, t6);
    			append(div2, t7);
    			append(div2, button1);
    			append(button1, t8);
    			insert(target, t9, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert(target, if_block1_anchor, anchor);
    			current = true;

    			dispose = [
    				listen(button0, "click", /*showPrevMonth*/ ctx[12]),
    				listen(button1, "click", /*showNextMonth*/ ctx[13])
    			];
    		},
    		p(ctx, dirty) {
    			if (!current || dirty[0] & /*$theme, $isSubmitted*/ 384 && p_class_value !== (p_class_value = "" + (/*$theme*/ ctx[8].invertBg + " " + /*$theme*/ ctx[8].invertText + " rounded-full shadow w-16 h-16 text-sm relative halo " + (/*$isSubmitted*/ ctx[7] && "animateRotate") + " svelte-bs19i3"))) {
    				attr(p, "class", p_class_value);
    			}

    			if_block0.p(ctx, dirty);

    			if (!current || dirty[0] & /*$theme*/ 256 && div1_class_value !== (div1_class_value = "" + (/*$theme*/ ctx[8].text + " text-center" + " svelte-bs19i3"))) {
    				attr(div1, "class", div1_class_value);
    			}

    			if (!current || dirty[0] & /*isPrevMonth*/ 32 && button0_class_value !== (button0_class_value = "px-2 py-1 font-bold text-2xl border-white mr-6 " + (!/*isPrevMonth*/ ctx[5] && "invisible") + " svelte-bs19i3")) {
    				attr(button0, "class", button0_class_value);
    			}

    			if (!current || dirty[0] & /*isNextMonth*/ 64 && button1_class_value !== (button1_class_value = "px-2 py-1 font-bold text-2xl border-white " + (!/*isNextMonth*/ ctx[6] && "invisible") + " svelte-bs19i3")) {
    				attr(button1, "class", button1_class_value);
    			}

    			if (!current || dirty[0] & /*$theme*/ 256 && div2_class_value !== (div2_class_value = "absolute bottom-0 mb-1 pageBtns " + /*$theme*/ ctx[8].text + " svelte-bs19i3")) {
    				attr(div2, "class", div2_class_value);
    			}

    			if (!!/*detail*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$4(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			if_block0.d();
    			if (detaching) detach(t5);
    			if (detaching) detach(div2);
    			if (detaching) detach(t9);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach(if_block1_anchor);
    			run_all(dispose);
    		}
    	};
    }

    function fillOutMonth(epochA, epochZ) {
    	// start of month is always 1
    	// if start date isn't 1, simply make an array with rest of values
    	const startDate = new Date(epochA).getDate();

    	let newBegDates = [];

    	if (startDate !== 1) {

    		for (let i = 1; i < startDate; i++) {
    			newBegDates.push({
    				day: new Date(epochA).setDate(i),
    				isCompleted: null
    			});
    		}
    	}

    	const lastDate = new Date(epochZ).getDate();
    	const lastMonth = new Date(epochZ).getMonth();
    	let newEndDates = [];

    	for (let i = lastDate + 1; i <= 31; i++) {
    		const tomorrow = new Date(epochZ);
    		tomorrow.setDate(i);

    		if (tomorrow.getMonth() !== lastMonth) {
    			break;
    		}

    		newEndDates.push({
    			day: new Date(epochZ).setDate(i),
    			isCompleted: null
    		});
    	}

    	return [newBegDates, newEndDates];
    }

    function yesterdayEpoch(epoch) {
    	const date = new Date(epoch);
    	return date.setDate(date.getDate() - 1);
    }

    function isCompletedContent(isCompleted) {
    	if (isCompleted === true) return "&check;"; else if (isCompleted === false) return "&times;"; else if (isCompleted === null) return "&nbsp;";
    }

    const func = x => x.startDay;

    function instance$7($$self, $$props, $$invalidate) {
    	let $day;
    	let $isSubmitted;
    	let $theme;
    	component_subscribe($$self, day, $$value => $$invalidate(18, $day = $$value));
    	component_subscribe($$self, isSubmitted, $$value => $$invalidate(7, $isSubmitted = $$value));
    	component_subscribe($$self, theme, $$value => $$invalidate(8, $theme = $$value));

    	const months = [
    		"January",
    		"February",
    		"March",
    		"April",
    		"May",
    		"June",
    		"July",
    		"August",
    		"September",
    		"October",
    		"November",
    		"December"
    	];

    	const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    	const history = JSON.parse(localStorage.getItem("history"));
    	const chainHistory = JSON.parse(localStorage.getItem("chainHistory")) || [];
    	const numRecDays = history.numRecDays;
    	const yesterday = new Date(yesterdayEpoch($day.getTime()));
    	let year = yesterday.getFullYear();
    	let month = yesterday.getMonth();
    	let visibleMonth = populateMonth();
    	let isAnimating = false;
    	let detail = null;

    	function populateMonth() {
    		let monthArray = history[year][month];
    		const [begArray, endArray] = fillOutMonth(monthArray[0].day, monthArray[monthArray.length - 1].day);
    		monthArray = [...begArray, ...monthArray, ...endArray];

    		return monthArray.map(day => {
    			const date = new Date(day.day);

    			const value = {
    				isCompleted: day.isCompleted,
    				weekday: date.getDay(),
    				day: date.getDate(),
    				epoch: day.day
    			};

    			return value;
    		});
    	}

    	function changeMonth() {
    		$$invalidate(2, isAnimating = true);

    		setTimeout(
    			() => {
    				$$invalidate(2, isAnimating = false);
    				$$invalidate(1, visibleMonth = populateMonth());
    			},
    			300
    		);
    	}

    	function showPrevMonth() {
    		if (month) {
    			$$invalidate(17, month = month - 1);
    		} else {
    			$$invalidate(17, month = 11);
    			$$invalidate(0, year = year - 1);
    		}

    		changeMonth();
    	}

    	function showNextMonth() {
    		if (month !== 11) {
    			$$invalidate(17, month = month + 1);
    		} else {
    			$$invalidate(17, month = 0);
    			$$invalidate(0, year = year + 1);
    		}

    		changeMonth();
    	}

    	function isCompletedStyles(isCompleted, epoch) {
    		let submittedClass = "";

    		// if day was just submitted and the day is the last submitted day
    		if ($isSubmitted && epoch === yesterdayEpoch($day)) {
    			submittedClass = " animatePop";
    		}

    		if (isCompleted === true) return "bg-green-500" + submittedClass; else if (isCompleted === false) return "bg-red-600" + submittedClass; else if (isCompleted === null) return "bg-gray-500";
    	}

    	function showDetail({ target }) {
    		const id = parseInt(target.id || target.parentNode.id);
    		$$invalidate(3, detail = chainHistory.filter(item => item.startDay === id)[0]);
    	}

    	function closeModal() {
    		$$invalidate(3, detail = null);
    	}

    	let monthName;
    	let isPrevMonth;
    	let isNextMonth;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*month*/ 131072) {
    			 $$invalidate(4, monthName = months[month]);
    		}

    		if ($$self.$$.dirty[0] & /*month, year*/ 131073) {
    			 $$invalidate(5, isPrevMonth = month ? !!history[year][month - 1] : !!history[year - 1]);
    		}

    		if ($$self.$$.dirty[0] & /*month, year*/ 131073) {
    			 $$invalidate(6, isNextMonth = month !== 11
    			? !!history[year][month + 1]
    			: !!history[year + 1]);
    		}
    	};

    	return [
    		year,
    		visibleMonth,
    		isAnimating,
    		detail,
    		monthName,
    		isPrevMonth,
    		isNextMonth,
    		$isSubmitted,
    		$theme,
    		weekdays,
    		chainHistory,
    		numRecDays,
    		showPrevMonth,
    		showNextMonth,
    		isCompletedStyles,
    		showDetail,
    		closeModal
    	];
    }

    class Calendar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$8, safe_not_equal, {}, [-1, -1]);
    	}
    }

    /* src/components/Toast.svelte generated by Svelte v3.17.3 */

    function create_fragment$9(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let span;
    	let raw_value = "&times;" + "";
    	let div_class_value;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text(/*message*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			attr(span, "class", "absolute top-0 right-0 p-1 bg-white border-black border-solid border-2 leading-none font-bold text-black rounded-full mt-1 mr-1 h-8 w-8");
    			attr(div, "class", div_class_value = "" + (/*$theme*/ ctx[1].invertBg + " " + /*$theme*/ ctx[1].invertText + " relative py-2 px-8 border-2 " + /*$theme*/ ctx[1].invertBorder + " rounded-lg border-solid mt-2" + " svelte-15km7oa"));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    			append(div, span);
    			span.innerHTML = raw_value;
    			dispose = listen(div, "click", /*deleteToast*/ ctx[2]);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*message*/ 1) set_data(t0, /*message*/ ctx[0]);

    			if (dirty & /*$theme*/ 2 && div_class_value !== (div_class_value = "" + (/*$theme*/ ctx[1].invertBg + " " + /*$theme*/ ctx[1].invertText + " relative py-2 px-8 border-2 " + /*$theme*/ ctx[1].invertBorder + " rounded-lg border-solid mt-2" + " svelte-15km7oa"))) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			dispose();
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $theme;
    	component_subscribe($$self, theme, $$value => $$invalidate(1, $theme = $$value));
    	let { id } = $$props;
    	let { message } = $$props;

    	function deleteToast() {
    		if (to) clearTimeout(to);
    		toasts.update(toasts => toasts.filter(toast => toast.id !== id));
    	}

    	const to = setTimeout(deleteToast, 5000);

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(3, id = $$props.id);
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    	};

    	return [message, $theme, deleteToast, id];
    }

    class Toast extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$9, safe_not_equal, { id: 3, message: 0 });
    	}
    }

    /* src/components/Nav.svelte generated by Svelte v3.17.3 */

    function create_if_block_4$1(ctx) {
    	let span;
    	let t;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			t = text("HOME");
    			attr(span, "class", span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$theme*/ 2 && span_class_value !== (span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (36:4) {#if !isMobile}
    function create_if_block_3$1(ctx) {
    	let span;
    	let t;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			t = text("EDIT CHAIN");
    			attr(span, "class", span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$theme*/ 2 && span_class_value !== (span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (39:2) {#if $hasHistory}
    function create_if_block_1$3(ctx) {
    	let button;
    	let t0;
    	let span;
    	let t1;
    	let span_class_value;
    	let dispose;
    	let if_block = !/*isMobile*/ ctx[0] && create_if_block_2$3(ctx);

    	return {
    		c() {
    			button = element("button");
    			if (if_block) if_block.c();
    			t0 = space();
    			span = element("span");
    			t1 = text("📅");

    			attr(span, "class", span_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "calendar"
    			? "bg-white"
    			: "bg-gray-500") + " svelte-11fzt6");

    			attr(button, "type", "button");
    			button.value = "calendar";
    			attr(button, "class", "menuBtn block calendar font-bold svelte-11fzt6");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			if (if_block) if_block.m(button, null);
    			append(button, t0);
    			append(button, span);
    			append(span, t1);
    			dispose = listen(button, "click", /*changeTab*/ ctx[4]);
    		},
    		p(ctx, dirty) {
    			if (!/*isMobile*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$3(ctx);
    					if_block.c();
    					if_block.m(button, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*$tab*/ 4 && span_class_value !== (span_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "calendar"
    			? "bg-white"
    			: "bg-gray-500") + " svelte-11fzt6")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};
    }

    // (45:6) {#if !isMobile}
    function create_if_block_2$3(ctx) {
    	let span;
    	let t;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			t = text("HISTORY");
    			attr(span, "class", span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$theme*/ 2 && span_class_value !== (span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (54:4) {#if !isMobile}
    function create_if_block$5(ctx) {
    	let span;
    	let t;
    	let span_class_value;

    	return {
    		c() {
    			span = element("span");
    			t = text("BADGES & SETTINGS");
    			attr(span, "class", span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$theme*/ 2 && span_class_value !== (span_class_value = "leading-tight " + /*$theme*/ ctx[1].invertText + " svelte-11fzt6")) {
    				attr(span, "class", span_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let nav;
    	let button0;
    	let t0;
    	let span0;
    	let t1;
    	let span0_class_value;
    	let t2;
    	let button1;
    	let t3;
    	let span1;
    	let t4;
    	let span1_class_value;
    	let t5;
    	let t6;
    	let button2;
    	let t7;
    	let span2;
    	let t8;
    	let span2_class_value;
    	let nav_class_value;
    	let nav_intro;
    	let nav_outro;
    	let current;
    	let dispose;
    	let if_block0 = !/*isMobile*/ ctx[0] && create_if_block_4$1(ctx);
    	let if_block1 = !/*isMobile*/ ctx[0] && create_if_block_3$1(ctx);
    	let if_block2 = /*$hasHistory*/ ctx[3] && create_if_block_1$3(ctx);
    	let if_block3 = !/*isMobile*/ ctx[0] && create_if_block$5(ctx);

    	return {
    		c() {
    			nav = element("nav");
    			button0 = element("button");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			span0 = element("span");
    			t1 = text("🏠");
    			t2 = space();
    			button1 = element("button");
    			if (if_block1) if_block1.c();
    			t3 = space();
    			span1 = element("span");
    			t4 = text("✏️");
    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();
    			button2 = element("button");
    			if (if_block3) if_block3.c();
    			t7 = space();
    			span2 = element("span");
    			t8 = text("👤");
    			attr(span0, "class", span0_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "today" ? "bg-white" : "bg-gray-500") + " svelte-11fzt6");
    			attr(button0, "type", "button");
    			button0.value = "today";
    			attr(button0, "class", "menuBtn block today font-bold svelte-11fzt6");
    			attr(span1, "class", span1_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "edit" ? "bg-white" : "bg-gray-500") + " svelte-11fzt6");
    			attr(button1, "type", "button");
    			button1.value = "edit";
    			attr(button1, "class", "menuBtn block edit font-bold svelte-11fzt6");
    			attr(span2, "class", span2_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "user" ? "bg-white" : "bg-gray-500") + " svelte-11fzt6");
    			attr(button2, "type", "button");
    			button2.value = "user";
    			attr(button2, "class", "menuBtn block user font-bold svelte-11fzt6");

    			attr(nav, "class", nav_class_value = "" + ((/*isMobile*/ ctx[0]
    			? "mobileNav rounded-full fixed"
    			: "hidden md:block desktopNav") + " z-10 " + /*$theme*/ ctx[1].invertBg + " border-4 border-solid " + /*$theme*/ ctx[1].invertBorder + " shadow-lg" + " svelte-11fzt6"));
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, button0);
    			if (if_block0) if_block0.m(button0, null);
    			append(button0, t0);
    			append(button0, span0);
    			append(span0, t1);
    			append(nav, t2);
    			append(nav, button1);
    			if (if_block1) if_block1.m(button1, null);
    			append(button1, t3);
    			append(button1, span1);
    			append(span1, t4);
    			append(nav, t5);
    			if (if_block2) if_block2.m(nav, null);
    			append(nav, t6);
    			append(nav, button2);
    			if (if_block3) if_block3.m(button2, null);
    			append(button2, t7);
    			append(button2, span2);
    			append(span2, t8);
    			current = true;

    			dispose = [
    				listen(button0, "click", /*changeTab*/ ctx[4]),
    				listen(button1, "click", /*changeTab*/ ctx[4]),
    				listen(button2, "click", /*changeTab*/ ctx[4])
    			];
    		},
    		p(ctx, [dirty]) {
    			if (!/*isMobile*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					if_block0.m(button0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty & /*$tab*/ 4 && span0_class_value !== (span0_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "today" ? "bg-white" : "bg-gray-500") + " svelte-11fzt6")) {
    				attr(span0, "class", span0_class_value);
    			}

    			if (!/*isMobile*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(button1, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*$tab*/ 4 && span1_class_value !== (span1_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "edit" ? "bg-white" : "bg-gray-500") + " svelte-11fzt6")) {
    				attr(span1, "class", span1_class_value);
    			}

    			if (/*$hasHistory*/ ctx[3]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$3(ctx);
    					if_block2.c();
    					if_block2.m(nav, t6);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!/*isMobile*/ ctx[0]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$5(ctx);
    					if_block3.c();
    					if_block3.m(button2, t7);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (!current || dirty & /*$tab*/ 4 && span2_class_value !== (span2_class_value = "menuIcon block " + (/*$tab*/ ctx[2] === "user" ? "bg-white" : "bg-gray-500") + " svelte-11fzt6")) {
    				attr(span2, "class", span2_class_value);
    			}

    			if (!current || dirty & /*isMobile, $theme*/ 3 && nav_class_value !== (nav_class_value = "" + ((/*isMobile*/ ctx[0]
    			? "mobileNav rounded-full fixed"
    			: "hidden md:block desktopNav") + " z-10 " + /*$theme*/ ctx[1].invertBg + " border-4 border-solid " + /*$theme*/ ctx[1].invertBorder + " shadow-lg" + " svelte-11fzt6"))) {
    				attr(nav, "class", nav_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (nav_outro) nav_outro.end(1);
    				if (!nav_intro) nav_intro = create_in_transition(nav, scale, { start: 0.2, easing: backInOut });
    				nav_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			if (nav_intro) nav_intro.invalidate();
    			nav_outro = create_out_transition(nav, scale, { start: 0.2, easing: backInOut });
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(nav);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching && nav_outro) nav_outro.end();
    			run_all(dispose);
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $theme;
    	let $tab;
    	let $hasHistory;
    	component_subscribe($$self, theme, $$value => $$invalidate(1, $theme = $$value));
    	component_subscribe($$self, tab, $$value => $$invalidate(2, $tab = $$value));
    	component_subscribe($$self, hasHistory, $$value => $$invalidate(3, $hasHistory = $$value));
    	const dispatch = createEventDispatcher();
    	let { isMobile } = $$props;

    	function changeTab(e) {
    		dispatch("changeTab", {
    			value: e.target.value || e.target.parentNode.value
    		});
    	}

    	$$self.$set = $$props => {
    		if ("isMobile" in $$props) $$invalidate(0, isMobile = $$props.isMobile);
    	};

    	return [isMobile, $theme, $tab, $hasHistory, changeTab];
    }

    class Nav extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$a, safe_not_equal, { isMobile: 0 });
    	}
    }

    /* src/App.svelte generated by Svelte v3.17.3 */

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i].id;
    	child_ctx[10] = list[i].message;
    	return child_ctx;
    }

    // (43:2) {#if !$isFirstTime}
    function create_if_block_7(ctx) {
    	let current;
    	const nav = new Nav({ props: { isMobile: false } });
    	nav.$on("changeTab", /*changeTab*/ ctx[6]);

    	return {
    		c() {
    			create_component(nav.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(nav, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(nav, detaching);
    		}
    	};
    }

    // (79:29) 
    function create_if_block_6(ctx) {
    	let main;
    	let main_intro;
    	let main_outro;
    	let current;
    	const user = new User({});

    	return {
    		c() {
    			main = element("main");
    			create_component(user.$$.fragment);
    			attr(main, "class", "svelte-liskfb");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(user, main, null);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(user.$$.fragment, local);

    			add_render_callback(() => {
    				if (main_outro) main_outro.end(1);

    				if (!main_intro) main_intro = create_in_transition(main, scale, {
    					start: 0.3,
    					delay: 200,
    					easing: backInOut
    				});

    				main_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(user.$$.fragment, local);
    			if (main_intro) main_intro.invalidate();
    			main_outro = create_out_transition(main, scale, {});
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(user);
    			if (detaching && main_outro) main_outro.end();
    		}
    	};
    }

    // (71:33) 
    function create_if_block_5(ctx) {
    	let main;
    	let main_intro;
    	let main_outro;
    	let current;
    	const calendar = new Calendar({});

    	return {
    		c() {
    			main = element("main");
    			create_component(calendar.$$.fragment);
    			attr(main, "class", "relative svelte-liskfb");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(calendar, main, null);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(calendar.$$.fragment, local);

    			add_render_callback(() => {
    				if (main_outro) main_outro.end(1);
    				if (!main_intro) main_intro = create_in_transition(main, scale, { delay: 200, easing: backInOut });
    				main_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(calendar.$$.fragment, local);
    			if (main_intro) main_intro.invalidate();
    			main_outro = create_out_transition(main, scale, {});
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(calendar);
    			if (detaching && main_outro) main_outro.end();
    		}
    	};
    }

    // (67:29) 
    function create_if_block_4$2(ctx) {
    	let main;
    	let main_intro;
    	let main_outro;
    	let current;
    	const editchain = new EditChain({});

    	return {
    		c() {
    			main = element("main");
    			create_component(editchain.$$.fragment);
    			attr(main, "class", "svelte-liskfb");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(editchain, main, null);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(editchain.$$.fragment, local);

    			add_render_callback(() => {
    				if (main_outro) main_outro.end(1);

    				if (!main_intro) main_intro = create_in_transition(main, scale, {
    					start: 0.3,
    					delay: 200,
    					easing: backInOut
    				});

    				main_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(editchain.$$.fragment, local);
    			if (main_intro) main_intro.invalidate();
    			main_outro = create_out_transition(main, scale, {});
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(editchain);
    			if (detaching && main_outro) main_outro.end();
    		}
    	};
    }

    // (63:3) {#if $tab === 'today'}
    function create_if_block_3$2(ctx) {
    	let main;
    	let main_intro;
    	let main_outro;
    	let current;
    	const today = new Today({});

    	return {
    		c() {
    			main = element("main");
    			create_component(today.$$.fragment);
    			attr(main, "class", "svelte-liskfb");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(today, main, null);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(today.$$.fragment, local);

    			add_render_callback(() => {
    				if (main_outro) main_outro.end(1);

    				if (!main_intro) main_intro = create_in_transition(main, scale, {
    					start: 0.3,
    					delay: 200,
    					easing: backInOut
    				});

    				main_intro.start();
    			});

    			current = true;
    		},
    		o(local) {
    			transition_out(today.$$.fragment, local);
    			if (main_intro) main_intro.invalidate();
    			main_outro = create_out_transition(main, scale, {});
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(today);
    			if (detaching && main_outro) main_outro.end();
    		}
    	};
    }

    // (85:3) {#if $toasts.length && !isIntro}
    function create_if_block_2$4(ctx) {
    	let div;
    	let div_transition;
    	let current;
    	let each_value = /*$toasts*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "absolute top-0 left-0 mt-2 w-full");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$toasts*/ 32) {
    				each_value = /*$toasts*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, { duration: 550, easing: backInOut }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (!div_transition) div_transition = create_bidirectional_transition(div, scale, { duration: 550, easing: backInOut }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};
    }

    // (90:5) {#each $toasts as { id, message }}
    function create_each_block$5(ctx) {
    	let current;

    	const toast = new Toast({
    			props: {
    				id: /*id*/ ctx[9],
    				message: /*message*/ ctx[10]
    			}
    		});

    	return {
    		c() {
    			create_component(toast.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(toast, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const toast_changes = {};
    			if (dirty & /*$toasts*/ 32) toast_changes.id = /*id*/ ctx[9];
    			if (dirty & /*$toasts*/ 32) toast_changes.message = /*message*/ ctx[10];
    			toast.$set(toast_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(toast.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(toast.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(toast, detaching);
    		}
    	};
    }

    // (98:0) {#if !$isFirstTime}
    function create_if_block_1$4(ctx) {
    	let button;
    	let raw_value = (/*isNav*/ ctx[0] ? "&times;" : "⋮") + "";
    	let button_class_value;
    	let dispose;

    	return {
    		c() {
    			button = element("button");

    			attr(button, "class", button_class_value = "fixed z-20 md:hidden bottom-0 right-0 m-4 border-gray-800 border-solid w-12 h-12 font-bold rounded-full leading-none border-2 " + (/*isNav*/ ctx[0]
    			? "bg-white text-xl"
    			: "text-4xl bg-gray-300"));
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			button.innerHTML = raw_value;
    			dispose = listen(button, "click", /*openNav*/ ctx[7]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*isNav*/ 1 && raw_value !== (raw_value = (/*isNav*/ ctx[0] ? "&times;" : "⋮") + "")) button.innerHTML = raw_value;
    			if (dirty & /*isNav*/ 1 && button_class_value !== (button_class_value = "fixed z-20 md:hidden bottom-0 right-0 m-4 border-gray-800 border-solid w-12 h-12 font-bold rounded-full leading-none border-2 " + (/*isNav*/ ctx[0]
    			? "bg-white text-xl"
    			: "text-4xl bg-gray-300"))) {
    				attr(button, "class", button_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    // (106:0) {#if isNav}
    function create_if_block$6(ctx) {
    	let current;
    	const nav = new Nav({ props: { isMobile: true } });
    	nav.$on("changeTab", /*changeTab*/ ctx[6]);

    	return {
    		c() {
    			create_component(nav.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(nav, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(nav, detaching);
    		}
    	};
    }

    function create_fragment$b(ctx) {
    	let t0;
    	let div10;
    	let div9;
    	let t1;
    	let div8;
    	let header;
    	let h1;
    	let t2;
    	let h1_class_value;
    	let t3;
    	let div7;
    	let div0;
    	let t4;
    	let div1;
    	let t5;
    	let div2;
    	let t6;
    	let div3;
    	let t7;
    	let div4;
    	let t8;
    	let div5;
    	let t9;
    	let div6;
    	let div7_class_value;
    	let t10;
    	let current_block_type_index;
    	let if_block1;
    	let t11;
    	let div10_class_value;
    	let t12;
    	let t13;
    	let if_block4_anchor;
    	let current;
    	const tailwindcss = new Tailwindcss({});
    	let if_block0 = !/*$isFirstTime*/ ctx[3] && create_if_block_7(ctx);
    	const if_block_creators = [create_if_block_3$2, create_if_block_4$2, create_if_block_5, create_if_block_6];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$tab*/ ctx[4] === "today") return 0;
    		if (/*$tab*/ ctx[4] === "edit") return 1;
    		if (/*$tab*/ ctx[4] === "calendar") return 2;
    		if (/*$tab*/ ctx[4] === "user") return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	let if_block2 = /*$toasts*/ ctx[5].length && !/*isIntro*/ ctx[1] && create_if_block_2$4(ctx);
    	let if_block3 = !/*$isFirstTime*/ ctx[3] && create_if_block_1$4(ctx);
    	let if_block4 = /*isNav*/ ctx[0] && create_if_block$6(ctx);

    	return {
    		c() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			div10 = element("div");
    			div9 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div8 = element("div");
    			header = element("header");
    			h1 = element("h1");
    			t2 = text("Don’t Break the Chain");
    			t3 = space();
    			div7 = element("div");
    			div0 = element("div");
    			t4 = space();
    			div1 = element("div");
    			t5 = space();
    			div2 = element("div");
    			t6 = space();
    			div3 = element("div");
    			t7 = space();
    			div4 = element("div");
    			t8 = space();
    			div5 = element("div");
    			t9 = space();
    			div6 = element("div");
    			t10 = space();
    			if (if_block1) if_block1.c();
    			t11 = space();
    			if (if_block2) if_block2.c();
    			t12 = space();
    			if (if_block3) if_block3.c();
    			t13 = space();
    			if (if_block4) if_block4.c();
    			if_block4_anchor = empty();
    			attr(h1, "class", h1_class_value = "text-3xl mb-2 text-center " + /*$theme*/ ctx[2].text + " svelte-liskfb");
    			attr(div0, "class", "chain svelte-liskfb");
    			attr(div1, "class", "chain svelte-liskfb");
    			attr(div2, "class", "chain svelte-liskfb");
    			attr(div3, "class", "chain svelte-liskfb");
    			attr(div4, "class", "chain svelte-liskfb");
    			attr(div5, "class", "chain svelte-liskfb");
    			attr(div6, "class", "chain svelte-liskfb");
    			attr(div7, "class", div7_class_value = "flex items-center justify-center mb-4 " + /*$theme*/ ctx[2].text + " svelte-liskfb");
    			attr(header, "class", "svelte-liskfb");
    			attr(div8, "class", "grid relative w-full h-full md:px-4 svelte-liskfb");
    			attr(div9, "class", "mainWrapper p-2 h-screen mx-auto md:flex relative overflow-hidden  svelte-liskfb");
    			attr(div10, "class", div10_class_value = "" + (null_to_empty(/*$theme*/ ctx[2].bg) + " svelte-liskfb"));
    		},
    		m(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div10, anchor);
    			append(div10, div9);
    			if (if_block0) if_block0.m(div9, null);
    			append(div9, t1);
    			append(div9, div8);
    			append(div8, header);
    			append(header, h1);
    			append(h1, t2);
    			append(header, t3);
    			append(header, div7);
    			append(div7, div0);
    			append(div7, t4);
    			append(div7, div1);
    			append(div7, t5);
    			append(div7, div2);
    			append(div7, t6);
    			append(div7, div3);
    			append(div7, t7);
    			append(div7, div4);
    			append(div7, t8);
    			append(div7, div5);
    			append(div7, t9);
    			append(div7, div6);
    			append(div8, t10);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div8, null);
    			}

    			append(div8, t11);
    			if (if_block2) if_block2.m(div8, null);
    			insert(target, t12, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert(target, t13, anchor);
    			if (if_block4) if_block4.m(target, anchor);
    			insert(target, if_block4_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*$isFirstTime*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_7(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div9, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*$theme*/ 4 && h1_class_value !== (h1_class_value = "text-3xl mb-2 text-center " + /*$theme*/ ctx[2].text + " svelte-liskfb")) {
    				attr(h1, "class", h1_class_value);
    			}

    			if (!current || dirty & /*$theme*/ 4 && div7_class_value !== (div7_class_value = "flex items-center justify-center mb-4 " + /*$theme*/ ctx[2].text + " svelte-liskfb")) {
    				attr(div7, "class", div7_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block1) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block1 = if_blocks[current_block_type_index];

    					if (!if_block1) {
    						if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block1.c();
    					}

    					transition_in(if_block1, 1);
    					if_block1.m(div8, t11);
    				} else {
    					if_block1 = null;
    				}
    			}

    			if (/*$toasts*/ ctx[5].length && !/*isIntro*/ ctx[1]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_2$4(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div8, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*$theme*/ 4 && div10_class_value !== (div10_class_value = "" + (null_to_empty(/*$theme*/ ctx[2].bg) + " svelte-liskfb"))) {
    				attr(div10, "class", div10_class_value);
    			}

    			if (!/*$isFirstTime*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1$4(ctx);
    					if_block3.c();
    					if_block3.m(t13.parentNode, t13);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*isNav*/ ctx[0]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    					transition_in(if_block4, 1);
    				} else {
    					if_block4 = create_if_block$6(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(if_block4);
    			current = true;
    		},
    		o(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(if_block4);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div10);
    			if (if_block0) if_block0.d();

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			if (if_block2) if_block2.d();
    			if (detaching) detach(t12);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach(t13);
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach(if_block4_anchor);
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let $day;
    	let $theme;
    	let $isFirstTime;
    	let $tab;
    	let $toasts;
    	component_subscribe($$self, day, $$value => $$invalidate(8, $day = $$value));
    	component_subscribe($$self, theme, $$value => $$invalidate(2, $theme = $$value));
    	component_subscribe($$self, isFirstTime, $$value => $$invalidate(3, $isFirstTime = $$value));
    	component_subscribe($$self, tab, $$value => $$invalidate(4, $tab = $$value));
    	component_subscribe($$self, toasts, $$value => $$invalidate(5, $toasts = $$value));
    	let isNav = false;
    	let isIntro = true;

    	onMount(() => {
    		setTimeout(() => $$invalidate(1, isIntro = false), 3000);

    		if (localStorage.currentDay) {
    			// day.set(new Date(parseInt(localStorage.currentDay)));
    			if (new Date().getDate() > $day.getDate()) {
    				toasts.create("You are in the past");
    			}
    		}
    	});

    	function changeTab({ detail }) {
    		tab.set(detail.value);
    		$$invalidate(0, isNav = false);
    	}

    	function openNav() {
    		$$invalidate(0, isNav = !isNav);
    	}

    	return [isNav, isIntro, $theme, $isFirstTime, $tab, $toasts, changeTab, openNav];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$a, create_fragment$b, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
