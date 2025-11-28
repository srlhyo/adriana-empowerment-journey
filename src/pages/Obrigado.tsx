import { CheckCircle, Phone, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useNavigation } from '@/contexts/NavigationContext';

const Obrigado = () => {
  const { navigate } = useNavigation();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4"
    >
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Agendamento recebido com sucesso!</h1>
      
      <div className="max-w-md space-y-4">
        <p className="text-gray-600">
          Obrigado pelo seu pedido! A Adriana irá entrar em contacto consigo nas próximas 24 horas.
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-center mb-2">
            <Phone className="w-5 h-5 text-amber-600 mr-2" />
            <h3 className="font-semibold text-amber-800">Pagamento via MB WAY</h3>
          </div>
          <p className="text-sm text-amber-700">
            Receberá um pedido de pagamento MB WAY no número de telefone que indicou. 
            Assim que o pagamento for confirmado, a sua sessão será oficialmente marcada.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center mb-2">
            <Euro className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-blue-800">Próximos Passos</h3>
          </div>
          <ul className="text-sm text-blue-700 text-left space-y-1">
            <li>• Verifique o seu telemóvel para o pedido de pagamento</li>
            <li>• Após o pagamento, receberá a confirmação final</li>
            <li>• Se escolheu sessão presencial, será contactado para alinhar detalhes</li>
          </ul>
        </div>

        <p className="text-sm text-gray-500">
          Qualquer dúvida, pode contactar diretamente através do WhatsApp.
        </p>
      </div>

      <Button size="lg" className="mt-8" onClick={() => navigate('/')}>Voltar à página inicial</Button>
    </motion.div>
  );
};

export default Obrigado;
