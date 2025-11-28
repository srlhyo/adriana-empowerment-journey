import { useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '@/contexts/NavigationContext';

const AuthCallback = () => {
  const { navigate } = useNavigation();

  useEffect(() => {
    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      toast.error('Erro na autenticação', {
        description: 'Ocorreu um erro durante o processo de autenticação com o Google.',
        duration: 5000,
      });
      navigate('/');
      return;
    }

    if (code) {
      // Show success message
      toast.success('✅ Autenticação concluída!', {
        description: 'A sua conta Google foi conectada com sucesso ao sistema de agendamento.',
        duration: 5000,
      });
      
      // Redirect back to home page
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } else {
      // No code or error parameter
      toast.error('Resposta inválida', {
        description: 'Não foi possível processar a resposta do Google.',
        duration: 5000,
      });
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-offwhite">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown mx-auto mb-4"></div>
        <h2 className="text-xl font-playfair text-brown mb-2">A processar autenticação...</h2>
        <p className="text-muted-foreground">Por favor aguarde enquanto completamos o processo.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
