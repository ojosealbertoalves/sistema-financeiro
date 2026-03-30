import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Home() {
  const [apiStatus, setApiStatus] = useState(null);

  useEffect(() => {
    api.get('/health')
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'));
  }, []);

  return (
    <div>
      <h1>Sistema Financeiro</h1>
      {apiStatus === null && <p>Verificando API...</p>}
      {apiStatus === 'online' && <p>API conectada ✓</p>}
      {apiStatus === 'offline' && <p>API offline</p>}
    </div>
  );
}
