import React, { useEffect } from 'react';
import { configureAmplify } from './amplify-config';
import PhoneNumberForm from './components/PhoneNumberForm';
import './App.css';
import './styles/main.css';

// Configure Amplify on app initialization
configureAmplify();

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>NewPushDemo</h1>
        <p>A simple application to collect phone numbers for push notifications</p>
      </header>
      <main className="container">
        <PhoneNumberForm />
      </main>
      <footer>
        <p>&copy; {new Date().getFullYear()} NewPushDemo. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
