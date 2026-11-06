// frontend/app/layout.js
import './globals.css';

export const metadata = {
  title: 'Wholesale Retention System',
  description: 'Customer Retention & Payment Follow-up System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

