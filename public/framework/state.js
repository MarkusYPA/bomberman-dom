export const state = makeReactive({
    tasks: [],
    filter: 'all',      // 'all', 'active', or 'completed'
    editingId: null,
    currentId: 1,
})

// Store subscribers by path - allows selective notifications
let subscribers = new Map() // path -> Set of callback functions
let pathSubscribers = new Map() // callback -> Set of paths they're watching

// Run the subscribed functions for a specific path
function notify(changedPath) {
    // Notify direct subscribers to this path
    if (subscribers.has(changedPath)) {
        subscribers.get(changedPath).forEach(fn => fn(changedPath))
    }
    
    // Notify subscribers to parent paths (e.g., 'players' when 'players.1' changes)
    const pathParts = changedPath.split('.')
    for (let i = pathParts.length - 1; i >= 0; i--) {
        const parentPath = pathParts.slice(0, i).join('.')
        if (subscribers.has(parentPath)) {
            subscribers.get(parentPath).forEach(fn => fn(changedPath))
        }
    }
    
    // Notify global subscribers (those watching '')
    if (subscribers.has('')) {
        subscribers.get('').forEach(fn => fn(changedPath))
    }
}

// Subscribe to specific state paths
export function subscribe(fn, paths = ['']) {
    if (typeof paths === 'string') paths = [paths]
    
    paths.forEach(path => {
        if (!subscribers.has(path)) {
            subscribers.set(path, new Set())
        }
        subscribers.get(path).add(fn)
        
        if (!pathSubscribers.has(fn)) {
            pathSubscribers.set(fn, new Set())
        }
        pathSubscribers.get(fn).add(path)
    })
}

// Unsubscribe a function from all its paths
export function unsubscribe(fn) {
    if (pathSubscribers.has(fn)) {
        pathSubscribers.get(fn).forEach(path => {
            if (subscribers.has(path)) {
                subscribers.get(path).delete(fn)
                if (subscribers.get(path).size === 0) {
                    subscribers.delete(path)
                }
            }
        })
        pathSubscribers.delete(fn)
    }
}

// Recursive Proxy: intercepts reads and writes
// Reactivity: when state is modified, calls notify() with the changed path
function makeReactive(obj, path = '') {
    return new Proxy(obj, {

        // Handle property reads
        get(target, key) {
            const value = target[key]
            const newPath = path ? `${path}.${key}` : key
            return (typeof value === 'object' && value !== null)
                ? makeReactive(value, newPath) // Deep proxy for nested objects
                : value
        },

        // Handle property writes
        set(target, key, value) {
            const newPath = path ? `${path}.${key}` : key
            target[key] = value
            notify(newPath) // Trigger subscribers for this specific path
            return true
        }
    })
}

// Helper function to create a reactive component that only re-renders when specific state paths change
export function createReactiveComponent(renderFn, watchPaths = ['']) {
    let mounted = false
    let currentElement = null
    
    function update(changedPath) {
        if (mounted && currentElement) {
            const newVNode = renderFn(changedPath)
            // Replace the current element with the new one
            const newElement = render(newVNode)
            currentElement.parentNode?.replaceChild(newElement, currentElement)
            currentElement = newElement
        }
    }
    
    subscribe(update, watchPaths)
    
    return {
        mount(container) {
            const vnode = renderFn()
            currentElement = render(vnode)
            container.appendChild(currentElement)
            mounted = true
            return currentElement
        },
        unmount() {
            if (currentElement && currentElement.parentNode) {
                currentElement.parentNode.removeChild(currentElement)
            }
            unsubscribe(update)
            mounted = false
        }
    }
}

// Helper function to create computed values that update when dependencies change
export function computed(computeFn, watchPaths) {
    let cachedValue = computeFn()
    let computedSubscribers = []
    
    function updateComputed() {
        const newValue = computeFn()
        if (newValue !== cachedValue) {
            cachedValue = newValue
            computedSubscribers.forEach(fn => fn(newValue))
        }
    }
    
    subscribe(updateComputed, watchPaths)
    
    return {
        get value() {
            return cachedValue
        },
        subscribe(fn) {
            computedSubscribers.push(fn)
        }
    }
}

// Import render function - we'll need this for createReactiveComponent
import { render } from './mini.js'
