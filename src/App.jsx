import { useState } from 'react';
import Landing from './components/Landing';
import Editor from './components/Editor';
import './App.css';

function App() {
  const [template, setTemplate] = useState(null); // 'breaking' | 'quotes' | null

  return (
    <div className="app-container">
      {!template ? (
        <Landing onSelect={setTemplate} />
      ) : (
        <Editor
          templateType={template}
          onBack={() => setTemplate(null)}
        />
      )}
    </div>
  );
}

export default App;
