// Example demonstrating granular state updates
import { createVNode, mount } from './framework/mini.js';
import { state, subscribe, createReactiveComponent, computed } from './framework/state.js';

// Example state structure
state.counter = 0;
state.user = {
    name: 'John',
    email: 'john@example.com',
    preferences: {
        theme: 'dark',
        notifications: true
    }
};
state.todos = [
    { id: 1, text: 'Learn reactive state', completed: false },
    { id: 2, text: 'Build awesome app', completed: false }
];

// Example 1: Component that only updates when counter changes
const CounterComponent = createReactiveComponent(
    () => createVNode('div', {},
        createVNode('h3', {}, `Counter: ${state.counter}`),
        createVNode('button', {
            onclick: () => state.counter++
        }, 'Increment')
    ),
    ['counter'] // Only watches counter changes
);

// Example 2: Component that only updates when user.name changes
const UserNameComponent = createReactiveComponent(
    () => createVNode('div', {},
        createVNode('h3', {}, `Welcome, ${state.user.name}!`),
        createVNode('input', {
            value: state.user.name,
            oninput: (e) => state.user.name = e.target.value
        })
    ),
    ['user.name'] // Only watches user.name changes
);

// Example 3: Component that updates when any user property changes
const UserProfileComponent = createReactiveComponent(
    () => createVNode('div', {},
        createVNode('h3', {}, 'User Profile'),
        createVNode('p', {}, `Name: ${state.user.name}`),
        createVNode('p', {}, `Email: ${state.user.email}`),
        createVNode('p', {}, `Theme: ${state.user.preferences.theme}`)
    ),
    ['user'] // Watches any changes under 'user'
);

// Example 4: Computed value that updates when todos change
const completedTodosCount = computed(
    () => state.todos.filter(todo => todo.completed).length,
    ['todos']
);

const TodoStatsComponent = createReactiveComponent(
    () => createVNode('div', {},
        createVNode('h3', {}, 'Todo Statistics'),
        createVNode('p', {}, `Total: ${state.todos.length}`),
        createVNode('p', {}, `Completed: ${completedTodosCount.value}`),
        createVNode('p', {}, `Remaining: ${state.todos.length - completedTodosCount.value}`)
    ),
    ['todos'] // Watches todos array changes
);

// Example 5: Component that watches multiple specific paths
const MultiWatchComponent = createReactiveComponent(
    () => createVNode('div', {},
        createVNode('h3', {}, 'Multi-Watch Component'),
        createVNode('p', {}, `Counter: ${state.counter}, Theme: ${state.user.preferences.theme}`)
    ),
    ['counter', 'user.preferences.theme'] // Watches multiple specific paths
);

// Demo function to show selective updates
function runDemo() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    // Mount all components
    CounterComponent.mount(container);
    UserNameComponent.mount(container);
    UserProfileComponent.mount(container);
    TodoStatsComponent.mount(container);
    MultiWatchComponent.mount(container);
    
    // Add some test buttons
    const testContainer = document.createElement('div');
    testContainer.innerHTML = `
        <h2>Test Buttons</h2>
        <button onclick="window.testCounter()">Update Counter</button>
        <button onclick="window.testUserName()">Update User Name</button>
        <button onclick="window.testUserEmail()">Update User Email</button>
        <button onclick="window.testTheme()">Toggle Theme</button>
        <button onclick="window.testTodos()">Add Todo</button>
    `;
    document.body.appendChild(testContainer);
    
    // Test functions
    window.testCounter = () => state.counter++;
    window.testUserName = () => state.user.name = 'Jane';
    window.testUserEmail = () => state.user.email = 'jane@example.com';
    window.testTheme = () => state.user.preferences.theme = state.user.preferences.theme === 'dark' ? 'light' : 'dark';
    window.testTodos = () => state.todos.push({ id: Date.now(), text: 'New todo', completed: false });
    
    console.log('Demo ready! Click the test buttons to see selective updates.');
    console.log('Only the relevant components will re-render when their watched state changes.');
}

// Uncomment to run the demo
// runDemo();

export { runDemo };
