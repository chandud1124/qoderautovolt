# 📝 Form Components Quick Reference

> **Quick copy-paste examples for AutoVolt enhanced form components**

---

## 🚀 Quick Start

### Import
```tsx
import { EnhancedInput } from '@/components/ui/enhanced-input';
import { EnhancedTextarea } from '@/components/ui/enhanced-textarea';
import { EnhancedSelect, EnhancedSelectItem } from '@/components/ui/enhanced-select';
```

---

## 📋 Common Patterns

### Basic Text Input
```tsx
<EnhancedInput
  label="Device Name"
  placeholder="Enter name"
  required
/>
```

### Email Input
```tsx
<EnhancedInput
  label="Email Address"
  type="email"
  icon={<Mail className="h-4 w-4" />}
  required
  hint="We'll never share your email"
/>
```

### Password Input
```tsx
<EnhancedInput
  label="Password"
  type="password"
  required
  hint="Minimum 8 characters"
/>
```

### Input with Validation
```tsx
<EnhancedInput
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  error={errors.username}
  success={usernameAvailable && "Available!"}
  loading={checking}
/>
```

### Textarea
```tsx
<EnhancedTextarea
  label="Description"
  showCount
  maxLength={500}
  rows={4}
/>
```

### Select Dropdown
```tsx
<EnhancedSelect
  label="Building"
  value={building}
  onValueChange={setBuilding}
  required
>
  <EnhancedSelectItem value="a">Block A</EnhancedSelectItem>
  <EnhancedSelectItem value="b">Block B</EnhancedSelectItem>
</EnhancedSelect>
```

---

## 🎨 Variants

### Filled Style
```tsx
<EnhancedInput
  label="Search"
  variant="filled"
  icon={<Search className="h-4 w-4" />}
/>
```

### Outlined Style
```tsx
<EnhancedInput
  label="Email"
  variant="outlined"
/>
```

---

## ✅ Validation States

### Error
```tsx
<EnhancedInput
  label="Email"
  error="Invalid email format"
/>
```

### Success
```tsx
<EnhancedInput
  label="Username"
  success="Username is available!"
/>
```

### Loading
```tsx
<EnhancedInput
  label="Code"
  loading
  hint="Checking..."
/>
```

---

## 🔧 Props Reference

### EnhancedInput
| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Floating label text |
| `error` | string | Error message |
| `success` | string | Success message |
| `hint` | string | Helper text |
| `loading` | boolean | Show spinner |
| `icon` | ReactNode | Leading icon |
| `variant` | 'default' \| 'filled' \| 'outlined' | Style |
| `required` | boolean | Show asterisk |

### EnhancedTextarea
| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Floating label text |
| `showCount` | boolean | Show character count |
| `maxLength` | number | Max characters |
| All other props same as EnhancedInput |

### EnhancedSelect
| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Floating label text |
| `value` | string | Selected value |
| `onValueChange` | function | Change handler |
| `placeholder` | string | Placeholder text |
| Other props same as EnhancedInput |

---

## 📱 Common Icons

```tsx
import {
  User,      // 👤 User/Name
  Mail,      // ✉️ Email
  Lock,      // 🔒 Password
  Phone,     // 📞 Phone
  Building,  // 🏢 Location
  Cpu,       // 💻 Device
  Search,    // 🔍 Search
  Calendar,  // 📅 Date
} from 'lucide-react';
```

---

## 🎯 Real-World Examples

### Device Form
```tsx
<EnhancedInput
  label="Device Name"
  icon={<Cpu className="h-4 w-4" />}
  required
/>

<EnhancedSelect
  label="Device Type"
  icon={<Cpu className="h-4 w-4" />}
  required
>
  <EnhancedSelectItem value="esp32">ESP32</EnhancedSelectItem>
  <EnhancedSelectItem value="esp8266">ESP8266</EnhancedSelectItem>
</EnhancedSelect>

<EnhancedInput
  label="IP Address"
  placeholder="192.168.1.100"
  pattern="^(\d{1,3}\.){3}\d{1,3}$"
/>

<EnhancedTextarea
  label="Description"
  showCount
  maxLength={300}
  rows={4}
/>
```

### User Form
```tsx
<EnhancedInput
  label="Full Name"
  icon={<User className="h-4 w-4" />}
  required
/>

<EnhancedInput
  label="Email"
  type="email"
  icon={<Mail className="h-4 w-4" />}
  required
/>

<EnhancedInput
  label="Password"
  type="password"
  icon={<Lock className="h-4 w-4" />}
  required
/>

<EnhancedSelect
  label="Role"
  required
>
  <EnhancedSelectItem value="admin">Admin</EnhancedSelectItem>
  <EnhancedSelectItem value="user">User</EnhancedSelectItem>
</EnhancedSelect>
```

---

## 🔥 Pro Tips

### 1. Always Use Labels
```tsx
// ❌ Bad
<EnhancedInput placeholder="Email" />

// ✅ Good
<EnhancedInput label="Email Address" placeholder="you@example.com" />
```

### 2. Provide Helpful Hints
```tsx
<EnhancedInput
  label="Password"
  type="password"
  hint="Must be at least 8 characters with 1 number"
/>
```

### 3. Use Appropriate Icons
```tsx
<EnhancedInput
  label="Search Devices"
  icon={<Search className="h-4 w-4" />}
/>
```

### 4. Show Validation States
```tsx
<EnhancedInput
  label="Username"
  value={username}
  onChange={handleChange}
  error={errors.username}
  success={!errors.username && username && "Looks good!"}
/>
```

### 5. Use Character Counters
```tsx
<EnhancedTextarea
  label="Notice"
  showCount
  maxLength={500}
/>
```

---

## 🎨 Styling Tips

### Custom Width
```tsx
<div className="max-w-md">
  <EnhancedInput label="Name" />
</div>
```

### Grid Layout
```tsx
<div className="grid grid-cols-2 gap-4">
  <EnhancedInput label="First Name" />
  <EnhancedInput label="Last Name" />
</div>
```

### Responsive
```tsx
<div className="grid md:grid-cols-2 gap-4">
  <EnhancedInput label="Email" />
  <EnhancedInput label="Phone" />
</div>
```

---

## ♿ Accessibility

### Always Include Labels
```tsx
<EnhancedInput label="Email" required />
```

### Provide Error Messages
```tsx
<EnhancedInput
  label="Email"
  error="Please enter a valid email address"
/>
```

### Use Semantic Types
```tsx
<EnhancedInput type="email" label="Email" />
<EnhancedInput type="tel" label="Phone" />
<EnhancedInput type="url" label="Website" />
```

---

## 📦 Migration from Old Components

### Before (shadcn/ui Input)
```tsx
<Label>Email</Label>
<Input
  type="email"
  placeholder="Enter email"
/>
{error && <p className="text-sm text-red-500">{error}</p>}
```

### After (EnhancedInput)
```tsx
<EnhancedInput
  label="Email"
  type="email"
  placeholder="Enter email"
  error={error}
/>
```

**Benefits:** Cleaner code, floating labels, built-in validation!

---

**Quick Reference v1.0**  
**Last Updated:** October 8, 2025  
**Components:** EnhancedInput, EnhancedTextarea, EnhancedSelect

