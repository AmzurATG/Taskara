# Taskara UI

A modern, production-ready task management application built with React, Vite, TypeScript, and Material UI. Inspired by Jira's functionality with a sleek, dark purple theme.

## 🚀 Features

- **Modern Tech Stack**: React 18, TypeScript, Vite, Material UI
- **Dark Theme**: Custom purple accent theme with dark backgrounds
- **Responsive Design**: Mobile-first approach with responsive layouts
- **State Management**: Redux Toolkit for scalable state management
- **Real-time Updates**: Built for real-time collaboration
- **Production Ready**: Optimized build configuration and best practices

## 🎨 Design System

### Colors
- **Primary Background**: `#181824`
- **Secondary Background**: `#232136`
- **Accent Purple**: `#a259ff`
- **Light Accent**: `#c084fc`
- **Text**: White (`#ffffff`) with secondary variants

### Typography
- **Primary Font**: Inter
- **Secondary Fonts**: Poppins, Montserrat
- **Fallback**: System fonts

## 📦 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Shared components
│   ├── layout/         # Layout components
│   ├── boards/         # Kanban board components
│   ├── tasks/          # Task-related components
│   ├── projects/       # Project components
│   ├── users/          # User components
│   ├── forms/          # Form components
│   ├── modals/         # Modal dialogs
│   └── navigation/     # Navigation components
├── pages/              # Application pages
├── hooks/              # Custom React hooks
├── services/           # API services
├── store/              # Redux store and slices
├── types/              # TypeScript type definitions
├── theme/              # Material UI theme configuration
├── assets/             # Static assets
├── constants/          # Application constants
├── contexts/           # React contexts
└── utils/              # Utility functions
```

## 🛠️ Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd taskara-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run type-check` - Check TypeScript types

## 🏗️ Architecture

### State Management
- **Redux Toolkit** for global state management
- **React Query** for server state management
- **Local State** for component-specific state

### Routing
- **React Router v6** for client-side routing
- **Protected Routes** for authentication
- **Lazy Loading** for code splitting

### Styling
- **Material UI** for component library
- **Emotion** for styled components
- **Custom Theme** for consistent design system

### API Integration
- **Axios** for HTTP requests
- **Interceptors** for request/response handling
- **Error Handling** with proper error boundaries

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=your_api_base_url
VITE_APP_VERSION=1.0.0
```

### Build Configuration
The project uses Vite for fast builds and HMR. Configuration can be found in:
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## 🧪 Testing

### Running Tests
```bash
npm run test
```

### Test Coverage
```bash
npm run test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support, email support@taskara.com or join our Slack channel.

---

Built with ❤️ by the Taskara Team