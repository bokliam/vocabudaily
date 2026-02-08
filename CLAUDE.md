# React Native Best Practices Guide

This document consolidates React Native best practices for the VocabuDaily project. Use this as a reference when making code changes, adding features, or reviewing code.

---

## 1. Project Structure & Organization

### Directory Structure
```
/src
  /assets          # Images, fonts, icons (organized by type)
  /components      # Reusable UI components
  /screens         # Screen components (one per route)
  /navigation      # Navigation configuration
  /services        # API calls, external integrations
  /hooks           # Custom React hooks
  /utils           # Helper functions, constants
  /types           # TypeScript type definitions
  /redux (or state) # State management
```

### Key Principles
- **Feature-based organization**: For larger projects, organize by feature rather than file type
- **One component per file**: Each component should be the default export of its file
- **Separate concerns**: Keep presentation components separate from container/logic components
- **Consistent naming**: Use PascalCase for components, camelCase for utilities/hooks

**DO:**
```typescript
// components/Button/Button.tsx
export default function Button({ onPress, title }) { ... }

// components/Button/index.ts
export { default } from './Button';
```

**DON'T:**
```typescript
// Multiple components in one file
export function Button() { ... }
export function Input() { ... }
```

---

## 2. Component Architecture

### Functional Components with Hooks
- Always use functional components with hooks (not class components)
- Separate container components (with logic) from presentation components (UI only)

**DO:**
```typescript
// Presentation component
function WordCard({ word, definition, onPress }) {
  return <Pressable onPress={onPress}>...</Pressable>;
}

// Container component
function WordCardContainer({ wordId }) {
  const word = useWord(wordId);
  const handlePress = () => { ... };
  return <WordCard word={word} onPress={handlePress} />;
}
```

### Styling
- Separate styles from component logic using StyleSheet.create()
- Keep styles at the bottom of the file or in a separate .styles.ts file
- Use consistent spacing/sizing tokens

**DO:**
```typescript
const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: 'bold' }
});
```

**DON'T:**
```typescript
<View style={{ padding: 16, backgroundColor: '#fff' }}>
```

---

## 3. Performance Optimization

### Critical Performance Rules

#### Always Test in Release Mode
- Performance testing MUST be done in release builds
- Dev mode has significant JavaScript thread overhead
- Use `--mode Release` or production builds for performance testing

#### Remove Console Logs in Production
```typescript
// Use a utility to strip console logs
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
```

#### List Rendering Optimization
**DO:**
```typescript
<FlatList
  data={words}
  renderItem={renderWord}
  keyExtractor={item => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={21}
/>
```

**Consider:**
- FlashList for better performance than FlatList
- VirtualizedList for custom list implementations

#### Image Optimization
- Use WebP format (reduces size by ~33% vs PNG/JPG)
- Use SVG for icons
- Implement image caching
- Use react-native-fast-image for better loading/caching

**DO:**
```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.normal }}
  resizeMode={FastImage.resizeMode.contain}
/>
```

#### Animations
- **ALWAYS** use `useNativeDriver: true` for Animated API
- At 60 FPS, each frame has only 16.67ms to render
- Native animations bypass the JavaScript thread

**DO:**
```typescript
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true, // CRITICAL
}).start();
```

**DON'T:**
```typescript
Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 300,
  // Missing useNativeDriver or set to false
}).start();
```

#### Memory Management
- Unsubscribe from event listeners in cleanup
- Clear intervals/timeouts
- Remove object references when no longer needed

**DO:**
```typescript
useEffect(() => {
  const subscription = eventEmitter.addListener('event', handler);
  return () => subscription.remove(); // Cleanup
}, []);
```

#### Memoization
- Only memoize when profiling shows it's needed
- Memoization has its own performance cost
- Most function recreation overhead is negligible

**Use sparingly:**
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const MemoizedComponent = React.memo(Component);
```

---

## 4. Security Best Practices

### Secure Data Storage
**DO:**
- Use react-native-keychain for sensitive data (tokens, passwords, certificates)
- iOS: Keychain Services
- Android: Keystore/Encrypted SharedPreferences

**DON'T:**
- Store sensitive data in AsyncStorage (unencrypted)
- Store API keys or secrets in code
- Log sensitive information (passwords, tokens, PII)

```typescript
import * as Keychain from 'react-native-keychain';

// Store credentials
await Keychain.setGenericPassword('username', 'password');

// Retrieve credentials
const credentials = await Keychain.getGenericPassword();
```

### Network Security
- **ALWAYS** use HTTPS/SSL for API calls
- Implement SSL pinning to prevent MITM attacks
- Validate server certificates

```typescript
// Consider using react-native-ssl-pinning
import { fetch } from 'react-native-ssl-pinning';

fetch('https://api.example.com', {
  method: 'GET',
  sslPinning: {
    certs: ['cert1', 'cert2']
  }
});
```

### Authentication
- Use OAuth2 with PKCE (Proof Key for Code Exchange)
- Use react-native-app-auth for OAuth flows
- Never store passwords in plain text
- Implement token refresh mechanisms

### Deep Linking Security
- Validate deep link parameters
- Sanitize all input from deep links
- Check origin of deep link requests
- Don't trust deep link data without validation

### Dependency Security
- Keep dependencies up to date
- Use automated security scanning (Dependabot, OWASP Dependency-Check)
- Review dependency changes before updating
- Integrate security checks in CI/CD

**DO:**
```bash
npm audit
npm audit fix
```

---

## 5. Testing & Quality Assurance

### Testing Strategy
1. **Unit Tests**: Jest + React Testing Library
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Detox or Appium for full app flows
4. **CI/CD**: Automate testing in pipeline

**DO:**
```typescript
import { render, fireEvent } from '@testing-library/react-native';

test('Button calls onPress when pressed', () => {
  const onPress = jest.fn();
  const { getByText } = render(<Button onPress={onPress} title="Press me" />);

  fireEvent.press(getByText('Press me'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

### Code Quality
- Write tests for critical functionality
- Test edge cases and error states
- Mock external dependencies
- Keep test coverage visible

---

## 6. Type Safety with TypeScript

### Benefits
- Catch type errors at compile time
- Better IDE autocomplete and refactoring
- Self-documenting code
- Easier maintenance and collaboration

**DO:**
```typescript
interface Word {
  id: string;
  term: string;
  definition: string;
  examples?: string[];
}

function WordCard({ word }: { word: Word }) {
  return <View>...</View>;
}
```

**DON'T:**
```typescript
function WordCard({ word }) { // No types
  return <View>...</View>;
}
```

### Best Practices
- Define interfaces for all data structures
- Type all function parameters and return values
- Avoid `any` - use `unknown` if type is truly unknown
- Use strict mode in tsconfig.json

---

## 7. Modern React Native Features

### New Architecture (Fabric + JSI)
- Fabric renderer: Faster UI updates, replaces old "bridge" model
- JSI (JavaScript Interface): Direct JavaScript-to-native communication
- TurboModules: Lazy-loaded native modules
- Hermes engine: Optimized JavaScript engine for React Native

**Enable Hermes:**
```javascript
// app.json or app.config.js
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

---

## 8. Development Workflow

### Key Metrics to Monitor
- **Time to Interactive (TTI)**: How quickly app becomes usable
- **Frames Per Second (FPS)**: UI smoothness (target: 60 FPS)
- **Bundle Size**: Smaller is faster
- **Memory Usage**: Prevent leaks and crashes

### Debugging
- Use React DevTools for component inspection
- Use Flipper for network, logs, and performance
- Enable performance monitor: Cmd+D (iOS) / Cmd+M (Android) → "Show Perf Monitor"
- Profile animations and re-renders

---

## 9. Common Pitfalls to Avoid

### DON'T:
1. ❌ Use inline styles or functions in render
2. ❌ Mutate state directly (always use setState/useState)
3. ❌ Forget to clean up subscriptions/listeners
4. ❌ Use index as key in lists with dynamic data
5. ❌ Store sensitive data in AsyncStorage
6. ❌ Leave console.log statements in production
7. ❌ Test performance in dev mode
8. ❌ Use animations without `useNativeDriver: true`
9. ❌ Over-memoize without profiling first
10. ❌ Create abstractions/utilities for one-time operations

### DO:
1. ✅ Extract inline functions and styles
2. ✅ Use immutable state updates
3. ✅ Return cleanup functions from useEffect
4. ✅ Use stable, unique IDs as keys
5. ✅ Use Keychain/Keystore for sensitive data
6. ✅ Remove all console statements before release
7. ✅ Profile in release/production builds
8. ✅ Enable native driver for all animations
9. ✅ Profile before optimizing
10. ✅ Keep it simple - only add complexity when needed

---

## 10. Code Simplicity Principles

### Avoid Over-Engineering
- Don't add features, refactoring, or "improvements" beyond what's requested
- Don't add comments/docstrings to code you didn't change
- Don't add error handling for scenarios that can't happen
- Don't create helpers/utilities for one-time operations
- Don't design for hypothetical future requirements
- Three similar lines of code is better than a premature abstraction

### Trust Your Code
- Only validate at system boundaries (user input, external APIs)
- Trust internal code and framework guarantees
- Don't add unnecessary fallbacks or defaults

### Keep It Direct
- Avoid feature flags for simple changes - just change the code
- Delete unused code completely (no `_unused` vars, no `// removed` comments)
- Don't maintain backwards compatibility unless explicitly required

---

## References & Sources

This guide was compiled from the following authoritative sources:

### General Best Practices
- [25 React Native Best Practices for High Performance Apps 2026](https://www.esparkinfo.com/blog/react-native-best-practices)
- [React Native in 2026: Advanced Practices, Challenges & Future Trends](https://medium.com/@EnaModernCoder/react-native-in-2026-advanced-practices-challenges-future-trends-1700dc7ab45e)
- [React Native Best Practices for Long-term Maintainability](https://www.brilworks.com/blog/react-native-best-practices/)
- [React Native Code Practices - DEV Community](https://dev.to/hellonehha/react-native-code-practices-6dl)

### Performance Optimization
- [Performance Overview - React Native Official Docs](https://reactnative.dev/docs/performance)
- [Master React Native Performance Optimization - Callstack](https://www.callstack.com/ebooks/the-ultimate-guide-to-react-native-optimization)
- [Optimizing React Native Performance: A Developer's Guide](https://dev.to/ajmal_hasan/optimizing-react-native-performance-a-developers-guide-3hd1)
- [React Native Performance Tactics - Sentry](https://blog.sentry.io/react-native-performance-strategies-tools/)

### Project Structure
- [React Native Project Structure - React Native Express](https://www.reactnative.express/app/project_structure)
- [React Native Project Structure: A Best Practices Guide](https://www.tricentis.com/learn/react-native-project-structure)
- [Best Practices for Structuring Your React Native Projects](https://medium.com/@dhidroid/best-practices-for-structuring-your-react-native-projects-1f9552a6c781)
- [How To Structure a React Native Project: Best Practices](https://cheesecakelabs.com/blog/efficient-way-structure-react-native-projects/)

### Security
- [Security - React Native Official Docs](https://reactnative.dev/docs/security)
- [Best Practices in Securing React Native Apps - Digital.ai](https://digital.ai/catalyst-blog/securing-react-native-applications/)
- [React Native Security: A Guide to Protecting Your App](https://www.itransition.com/developers/react-native/security)
- [Secure Your React Native App - Callstack](https://www.callstack.com/blog/secure-your-react-native-app)
- [Securing React Native Mobile Apps with OWASP MAS](https://owasp.org/blog/2024/10/02/Securing-React-Native-Mobile-Apps-with-OWASP-MAS)

---

**Last Updated:** 2026-01-31
**Project:** VocabuDaily
**Purpose:** Guide for maintaining code quality, performance, and security standards
