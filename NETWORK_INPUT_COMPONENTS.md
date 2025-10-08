# Network Input Components

Auto-formatting input components for MAC addresses and IP addresses with real-time validation.

## ✨ Features

### MAC Address Input
- ✅ **Auto-formatting**: Automatically adds separators (`:` or `-`) as you type
- ✅ **Format validation**: Validates MAC address format (6 pairs of hex digits)
- ✅ **Hex-only input**: Only accepts hexadecimal characters (0-9, A-F)
- ✅ **Uppercase conversion**: Automatically converts to uppercase
- ✅ **Visual feedback**: Green checkmark for valid, red X for invalid
- ✅ **Separator choice**: Choose between colon (`:`) or hyphen (`-`)
- ✅ **Paste support**: Auto-formats pasted MAC addresses
- ✅ **Smart cursor**: Maintains cursor position while formatting

**Format**: `AA:BB:CC:DD:EE:FF` or `AA-BB-CC-DD-EE-FF`

### IP Address Input
- ✅ **Auto-formatting**: Automatically adds dots (`.`) between octets
- ✅ **Range validation**: Limits each octet to 0-255
- ✅ **Smart input**: Auto-advances to next octet when typing 3 digits or reaching 255
- ✅ **Visual feedback**: Green checkmark when valid
- ✅ **Numeric-only**: Only accepts numbers and dots
- ✅ **Paste support**: Auto-formats pasted IP addresses
- ✅ **IPv4 validation**: Ensures 4 octets with proper values
- ✅ **Leading zero prevention**: Prevents invalid formats like `192.168.001.001`

**Format**: `XXX.XXX.XXX.XXX` (e.g., `192.168.1.1`)

## 📦 Installation

The components are already created in your project:
- `src/components/ui/mac-address-input.tsx`
- `src/components/ui/ip-address-input.tsx`
- `src/examples/network-input-example.tsx` (demo page)

## 🚀 Usage

### MAC Address Input

```tsx
import { MacAddressInput } from '@/components/ui/mac-address-input';

function MyComponent() {
  const [macAddress, setMacAddress] = useState('');
  const [isValid, setIsValid] = useState(false);

  return (
    <MacAddressInput
      value={macAddress}
      onChange={setMacAddress}
      onValidChange={(value, valid) => {
        setMacAddress(value);
        setIsValid(valid);
      }}
      separator=":"  // or "-"
      placeholder="AA:BB:CC:DD:EE:FF"
    />
  );
}
```

### IP Address Input

```tsx
import { IpAddressInput } from '@/components/ui/ip-address-input';

function MyComponent() {
  const [ipAddress, setIpAddress] = useState('');
  const [isValid, setIsValid] = useState(false);

  return (
    <IpAddressInput
      value={ipAddress}
      onChange={setIpAddress}
      onValidChange={(value, valid) => {
        setIpAddress(value);
        setIsValid(valid);
      }}
      placeholder="192.168.1.1"
      allowIncomplete={true}  // Allow partial IPs while typing
    />
  );
}
```

## 🎨 Props

### MacAddressInput Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Current MAC address value |
| `onChange` | `(value: string) => void` | - | Called when value changes |
| `onValidChange` | `(value: string, isValid: boolean) => void` | - | Called with validation status |
| `separator` | `':' \| '-'` | `':'` | Separator character |
| `placeholder` | `string` | `'AA:BB:CC:DD:EE:FF'` | Input placeholder |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable input |
| `required` | `boolean` | `false` | Mark as required |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |
| `name` | `string` | - | Input name attribute |
| `id` | `string` | - | Input id attribute |

### IpAddressInput Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Current IP address value |
| `onChange` | `(value: string) => void` | - | Called when value changes |
| `onValidChange` | `(value: string, isValid: boolean) => void` | - | Called with validation status |
| `placeholder` | `string` | `'192.168.1.1'` | Input placeholder |
| `className` | `string` | - | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable input |
| `required` | `boolean` | `false` | Mark as required |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |
| `allowIncomplete` | `boolean` | `true` | Allow partial IPs during typing |
| `name` | `string` | - | Input name attribute |
| `id` | `string` | - | Input id attribute |

## 💡 Examples

### Device Configuration Form

```tsx
import { MacAddressInput } from '@/components/ui/mac-address-input';
import { IpAddressInput } from '@/components/ui/ip-address-input';
import { Button } from '@/components/ui/button';

function DeviceConfigForm() {
  const [macAddress, setMacAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [macValid, setMacValid] = useState(false);
  const [ipValid, setIpValid] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (macValid && ipValid) {
      console.log('MAC:', macAddress);
      console.log('IP:', ipAddress);
      // Save configuration...
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>MAC Address</label>
        <MacAddressInput
          value={macAddress}
          onValidChange={(value, valid) => {
            setMacAddress(value);
            setMacValid(valid);
          }}
        />
      </div>

      <div>
        <label>IP Address</label>
        <IpAddressInput
          value={ipAddress}
          onValidChange={(value, valid) => {
            setIpAddress(value);
            setIpValid(valid);
          }}
        />
      </div>

      <Button type="submit" disabled={!macValid || !ipValid}>
        Save Configuration
      </Button>
    </form>
  );
}
```

### Network Settings

```tsx
function NetworkSettings() {
  const [settings, setSettings] = useState({
    ipAddress: '',
    subnetMask: '',
    gateway: '',
    dns: '',
  });

  return (
    <div className="space-y-4">
      <IpAddressInput
        value={settings.ipAddress}
        onChange={(value) => setSettings({ ...settings, ipAddress: value })}
        placeholder="192.168.1.100"
      />
      <IpAddressInput
        value={settings.subnetMask}
        onChange={(value) => setSettings({ ...settings, subnetMask: value })}
        placeholder="255.255.255.0"
      />
      <IpAddressInput
        value={settings.gateway}
        onChange={(value) => setSettings({ ...settings, gateway: value })}
        placeholder="192.168.1.1"
      />
      <IpAddressInput
        value={settings.dns}
        onChange={(value) => setSettings({ ...settings, dns: value })}
        placeholder="8.8.8.8"
      />
    </div>
  );
}
```

## 🎯 Behavior Details

### MAC Address Input Behavior

1. **Auto-formatting**:
   - As you type hex characters, separators are automatically added
   - Example: `AA` → `AA:` → `AA:BB` → `AA:BB:` → `AA:BB:CC`

2. **Validation**:
   - Must be exactly 6 pairs of hex digits
   - Each pair must be 0-9 or A-F
   - Pattern: `XX:XX:XX:XX:XX:XX`

3. **Input restrictions**:
   - Only hex characters (0-9, A-F) are accepted
   - Automatically converted to uppercase
   - Limited to 17 characters (12 hex + 5 separators)

4. **Paste behavior**:
   - Accepts any format: `AABBCCDDEEFF`, `AA:BB:CC:DD:EE:FF`, `AA-BB-CC-DD-EE-FF`
   - Automatically formats to selected separator style

### IP Address Input Behavior

1. **Auto-formatting**:
   - Dot is automatically added after typing 3 digits
   - Dot is automatically added when value reaches 255
   - Example: `192` → `192.` → `192.168` → `192.168.`

2. **Validation**:
   - Must have exactly 4 octets
   - Each octet must be 0-255
   - No leading zeros (except for `0` itself)
   - Pattern: `XXX.XXX.XXX.XXX`

3. **Input restrictions**:
   - Only numeric characters and dots are accepted
   - Each octet is automatically limited to 255
   - If you type `256`, it automatically caps at `255`
   - Maximum 4 octets

4. **Smart input**:
   - Typing `192168` → `192.168.`
   - After typing 3 digits, automatically adds dot
   - Pressing `.` manually moves to next octet

5. **Paste behavior**:
   - Accepts any format: `192168001001`, `192.168.1.1`
   - Automatically formats with dots

## 🎨 Styling

Both components use:
- Monospace font for better readability
- Green border when valid
- Red border when invalid
- Visual checkmark/X icon for validation status
- Smooth transitions for all states

You can customize styling by passing `className`:

```tsx
<MacAddressInput
  className="w-full max-w-md"
  // Your custom classes...
/>
```

## 🧪 Testing the Components

Run the demo page to test all features:

1. Navigate to `/network-input-example` in your app
2. Try typing MAC addresses and IP addresses
3. Test paste functionality
4. See real-time validation

## 📝 Notes

- **MAC Address**: Supports both colon (`:`) and hyphen (`-`) separators
- **IP Address**: Auto-completes dots for better UX
- **Validation**: Real-time validation with visual feedback
- **Accessibility**: Proper labels, ARIA attributes, and keyboard support
- **Mobile-friendly**: Works on touch devices with numeric keyboard for IP input

## 🔧 Integration with Forms

### React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form';
import { MacAddressInput } from '@/components/ui/mac-address-input';

function MyForm() {
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <Controller
        name="macAddress"
        control={control}
        rules={{ required: true, pattern: /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/ }}
        render={({ field }) => (
          <MacAddressInput
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </form>
  );
}
```

## 🎉 Live Demo

See the complete demo with all features:
- Go to `src/examples/network-input-example.tsx`
- Try different inputs
- Test validation
- Copy/paste examples provided

---

**Created:** October 8, 2025  
**Status:** ✅ Production Ready  
**TypeScript:** Fully Typed  
**Testing:** Manual testing recommended
