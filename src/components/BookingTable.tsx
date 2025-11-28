import { useState, ChangeEvent, FormEvent, useEffect, useCallback } from 'react';
import { Clock, User, Mail, MessageSquare, Loader2, Phone, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useBooking } from '@/contexts/BookingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '@/lib/config';
import { useNavigation } from '@/contexts/NavigationContext';

type Service = {
  id: number;
  name: string;
  duration: string;
  price: string;
  selected: boolean;
};

const BookingTable = () => {
  const isMobile = useIsMobile();
  const { navigate } = useNavigation();
  const { selectedPackage, clearSelectedPackage } = useBooking();

  const [services, setServices] = useState<Service[]>([
    { id: 1, name: 'Sessão Única', duration: '1 sessão', price: '70€', selected: false },
    { id: 2, name: 'Pacote de 4 Sessões', duration: '4 sessões', price: '280€', selected: false },
    { id: 3, name: 'Pacote de 10 Sessões', duration: '10 sessões', price: '700€', selected: false },
  ]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sessionType, setSessionType] = useState<'Online' | 'Presencial'>('Online');
  const [message, setMessage] = useState('');

  const [bookedTimes, setBookedTimes] = useState<{ [key: string]: string[] }>(() => {
    try {
      const savedBookings = typeof window !== 'undefined' ? localStorage.getItem('bookedTimes') : null;
      return savedBookings ? JSON.parse(savedBookings) : {};
    } catch (error) {
      console.error("Failed to parse bookedTimes from localStorage", error);
      return {};
    }
  });

  // Availability cache and loading state
  const [isFetchingAvailability, setIsFetchingAvailability] = useState(false);
  const [availabilityCache, setAvailabilityCache] = useState<{ [key: string]: { times: string[]; timestamp: number } }>({});

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('bookedTimes', JSON.stringify(bookedTimes));
      }
    } catch (error) {
      console.error("Failed to save bookedTimes to localStorage", error);
    }
  }, [bookedTimes]);

  // Function to fetch real availability from backend
  const fetchRealAvailability = async (date: Date): Promise<string[]> => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    // Check cache first (5 minute cache)
    const cached = availabilityCache[dateString];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log(`🎯 Using cached availability for ${dateString}`);
      return cached.times;
    }

    console.log(`📡 Fetching real availability for ${dateString}`);
    setIsFetchingAvailability(true);

    try {
      const response = await fetch(`${API_BASE_URL}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateString,
          timeZone: "Europe/Lisbon"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📅 Availability response for ${dateString}:`, data);

      if (data.success && data.availableTimes) {
        // Cache the result
        setAvailabilityCache(prev => ({
          ...prev,
          [dateString]: {
            times: data.availableTimes,
            timestamp: Date.now()
          }
        }));

        // Filter out locally booked times
        const localBookedForDate = bookedTimes[dateString] || [];
        const finalAvailableTimes = data.availableTimes.filter(time => !localBookedForDate.includes(time));

        console.log(`✅ Final available times for ${dateString}:`, finalAvailableTimes);
        
        // Show warning if using fallback times
        if (data.fallback) {
          toast.warning('⚠️ Usando horários pré-definidos', {
            description: 'A sincronização com a Google Calendar não está disponível. Os horários podem não refletir a disponibilidade real.',
            duration: 8000,
          });
        }
        
        return finalAvailableTimes;
      } else {
        throw new Error(data.error || 'Failed to fetch availability');
      }
    } catch (error) {
      console.error(`❌ Failed to fetch availability for ${dateString}:`, error);
      
      // Show error toast for calendar sync issues
      toast.error('❌ Problema na sincronização da agenda', {
        description: 'Não foi possível verificar a disponibilidade em tempo real. Usando horários pré-definidos.',
        duration: 6000,
      });
      
      // Fallback to mocked times
      console.log(`🔄 Falling back to mocked times for ${dateString}`);
      const day = date.getDay();
      const allTimes = (day === 0 || day === 6)
        ? ["10:00", "11:00"]
        : ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

      const localBookedForDate = bookedTimes[dateString] || [];
      return allTimes.filter((time: string) => !localBookedForDate.includes(time));
    } finally {
      setIsFetchingAvailability(false);
    }
  };

  // Legacy function for fallback
  const getMockedAvailableTimes = (date: Date): string[] => {
    const day = date.getDay();
    const allTimes = (day === 0 || day === 6)
      ? ["10:00", "11:00"]
      : ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

    const dateString = format(date, 'yyyy-MM-dd');
    const bookedForDate = bookedTimes[dateString] || [];

    return allTimes.filter((time: string) => !bookedForDate.includes(time));
  };

  const resetForm = useCallback(() => {
    setServices(services.map(s => ({ ...s, selected: false })));
    setSelectedDate(undefined);
    setAvailableTimes([]);
    setName('');
    setEmail('');
    setMessage('');
    setCurrentStep(1);
    setHasSubmitted(false);
  }, [services]);


  const handleDateSelect = async (date: Date | undefined) => {
    if (date) {
      const newSelectedDate = new Date(date);
      newSelectedDate.setHours(0, 0, 0, 0);
      setSelectedDate(newSelectedDate);
      
      // Show loading state for availability fetching
      if (isFetchingAvailability) {
        toast.info('A verificar disponibilidade...', {
          description: 'Por favor aguarde um momento.',
          duration: 2000,
        });
      }
      
      // Fetch real availability from backend
      const times = await fetchRealAvailability(newSelectedDate);
      setAvailableTimes(times);
      
      toast.success(`Data selecionada: ${format(newSelectedDate, 'dd/MM/yyyy')}`, {
        description: 'Agora selecione um horário disponível',
        duration: 3000,
        icon: '📅'
      });
    } else {
      setSelectedDate(undefined);
      setAvailableTimes([]);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDateWithTime = new Date(selectedDate);
      newDateWithTime.setHours(hours, minutes);
      setSelectedDate(newDateWithTime);
      
      toast.success(`Horário confirmado: ${time}`, {
        description: 'A avançar para os detalhes finais...',
        duration: 2000,
        icon: '⏰'
      });
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 500);
    }
  };

  const handleServiceSelect = (id: number) => {
    setServices(services.map(service => ({
      ...service,
      selected: service.id === id
    })));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 1) {
      return !services.some(service => service.selected);
    }
    if (currentStep === 2) {
      if (!selectedDate) return true;
      if (availableTimes.length > 0 && selectedDate.getHours() === 0 && selectedDate.getMinutes() === 0) {
        return true;
      }
      return false;
    }
    if (currentStep === 3) {
      const isPhoneValid = /^9[1236]\d{7}$/.test(phone);
      return !name || !email || !isPhoneValid;
    }
    return false;
  };

  const selectedService = services.find(s => s.selected);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Function to format date for Portugal timezone (Europe/Lisbon)
  const formatDateForPortugalTimezone = (date: Date): string => {
    // Create a new date object to avoid modifying the original
    const portugalDate = new Date(date);
    
    // Portugal timezone is UTC+0 or UTC+1 (WET/WEST)
    // Format as ISO string with timezone offset
    const offset = portugalDate.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetMinutes = Math.abs(offset) % 60;
    const offsetSign = offset <= 0 ? '+' : '-';
    
    // Format timezone offset as +01:00 or +00:00
    const timezoneOffset = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    
    // Format the date in ISO format but with the correct timezone
    const year = portugalDate.getFullYear();
    const month = (portugalDate.getMonth() + 1).toString().padStart(2, '0');
    const day = portugalDate.getDate().toString().padStart(2, '0');
    const hours = portugalDate.getHours().toString().padStart(2, '0');
    const minutes = portugalDate.getMinutes().toString().padStart(2, '0');
    const seconds = portugalDate.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
  };

  // Function to validate booking data before sending
  interface BookingData {
    email?: string;
    name?: string;
    summary?: string;
    start?: string;
    end?: string;
  }

  const validateBookingData = (data: BookingData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.email || !data.email.includes('@')) {
      errors.push('Email inválido');
    }
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Nome é obrigatório');
    }
    
    if (!data.summary) {
      errors.push('Serviço não selecionado');
    }
    
    if (!data.start || !data.end) {
      errors.push('Data e hora não selecionadas');
    }
    
    if (data.start && data.end) {
      const startDate = new Date(data.start);
      const endDate = new Date(data.end);
      
      if (startDate >= endDate) {
        errors.push('Data de início deve ser anterior à data de fim');
      }
      
      // Check if date is in the past
      const now = new Date();
      if (startDate < now) {
        errors.push('Não é possível agendar datas no passado');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Always prevent default form submission to avoid navigation/reload
    event.preventDefault();
    
    // Prevent double submission
    if (isSubmitting || hasSubmitted) {
      console.log('⚠️ Form already submitting or submitted - preventing double submission');
      return;
    }
    
    if (currentStep !== 3 || !selectedDate) {
      return;
    }
    
    // Mark as submitted to prevent double submission
    setHasSubmitted(true);
    
    const selectedTime = format(selectedDate, 'HH:mm');
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    console.log('🚀 Form submission started - sequential confirmation mode');
    
    // Store temporary booking data for potential rollback
    const tempBookingData = {
      dateString,
      selectedTime,
      previousBookedTimes: { ...bookedTimes }
    };
    
    // Show loading state
    setIsSubmitting(true);
    
    try {
      console.log('📅 Creating Google Calendar event...');
      
      // Calculate end time (1 hour after start)
      const endDate = new Date(selectedDate.getTime() + 60 * 60 * 1000);

      // Google Calendar integration: send booking to backend
      const calendarPayload = {
        email,
        name,
        phone,
        sessionType,
        summary: selectedService?.name || "Sessão",
        description: message || `Sessão agendada por ${name}`,
        start: formatDateForPortugalTimezone(selectedDate),
        end: formatDateForPortugalTimezone(endDate),
        location: sessionType === 'Online' ? 'Online' : 'Presencial',
        timeZone: 'Europe/Lisbon',
        // Add metadata for debugging
        metadata: {
          serviceId: selectedService?.id,
          sessionType,
          bookingTime: new Date().toISOString(),
          timezone: 'Europe/Lisbon'
        }
      };

      // Validate the payload before sending
      const validation = validateBookingData(calendarPayload);
      if (!validation.isValid) {
        console.error('❌ Booking validation failed:', validation.errors);
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      console.log('📤 Sending to Google Calendar:', calendarPayload);
      
      // Add timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const calendarResponse = await fetch(`${API_BASE_URL}/events/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(calendarPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!calendarResponse.ok) {
        const errorText = await calendarResponse.text();
        console.error('❌ Google Calendar API HTTP Error:', {
          status: calendarResponse.status,
          statusText: calendarResponse.statusText,
          response: errorText
        });
        throw new Error(`Google Calendar HTTP ${calendarResponse.status}: ${calendarResponse.statusText}`);
      }
      
      const calendarData = await calendarResponse.json();
      
      if (!calendarData.success) {
        console.error("❌ Google Calendar creation failed:", calendarData);
        throw new Error(`Google Calendar failed: ${calendarData.error || 'Unknown error'}`);
      }
      
      console.log("✅ Google Calendar event created:", calendarData.htmlLink);
      
      // ✅ SUCCESS - Now save to localStorage
      console.log('💾 Saving to localStorage...');
      
      setBookedTimes(prev => {
        const updatedBookings = { ...prev };
        if (!updatedBookings[tempBookingData.dateString]) {
          updatedBookings[tempBookingData.dateString] = [];
        }
        updatedBookings[tempBookingData.dateString].push(tempBookingData.selectedTime);
        return updatedBookings;
      });
      
      console.log('✅ Booking saved to localStorage');
      
      // Show success messages
      toast.success('✅ Agendamento confirmado com sucesso!', {
        description: 'Sua sessão foi agendada e você receberá um email de confirmação.',
        duration: 6000,
      });
      
      
      // Reset form and navigate to success page
      setTimeout(() => {
        resetForm();
        navigate('/obrigado');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Booking process failed:', error);
      
      // 🔄 ROLLBACK: Revert state since the booking failed
      console.log('🔄 Rolling back booking state...');
      
      let errorMessage = 'Falha no agendamento';
      let errorDescription = 'Por favor, tente novamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('Google Calendar')) {
          errorMessage = 'Erro na agenda do Google Calendar';
          errorDescription = 'Não foi possível criar o evento na agenda. Por favor, tente novamente.';
        } else if (error.message.includes('Validation')) {
          errorMessage = 'Dados inválidos';
          errorDescription = error.message.replace('Validation failed: ', '');
        } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          errorMessage = 'Timeout no servidor';
          errorDescription = 'O servidor demorou muito para responder. Por favor, tente novamente.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Servidor não disponível';
          errorDescription = 'Verifique sua conexão ou tente novamente mais tarde';
        }
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 8000,
      });
      
      // Show additional error details in console for debugging
      console.error('📋 Booking failed - no changes made to localStorage');
      console.error('📋 Temporary booking data (not saved):', tempBookingData);
      
    } finally {
      setIsSubmitting(false);
    }
    
    console.log('🏁 Form submission process completed');
  }

  useEffect(() => {
    if (selectedPackage && currentStep === 1) {
      const updatedServices = services.map(service => {
        if (service.name.toLowerCase() === selectedPackage.name.toLowerCase() ||
            (selectedPackage.name === 'Sessão Única' && service.name === 'Sessão Única')) {
          return { ...service, selected: true };
        }
        return { ...service, selected: false };
      });
      setServices(updatedServices);
    }
  }, [selectedPackage, currentStep, services]);

  return (
    <section id="booking-table" className="section-padding bg-offwhite">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="section-title">Agende a Sua Sessão</h2>
            <p className="text-muted-foreground mt-4">
              Selecione o serviço, a data e o horário que melhor se adequam à sua agenda.
            </p>
          </div>

          {selectedPackage && (
            <motion.div 
              className="bg-brown/5 border border-brown/20 rounded-lg p-4 mb-8 max-w-2xl mx-auto flex items-center justify-between"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center">
                <Package className="text-brown mr-3" />
                <div>
                  <p className="font-medium">Está a reservar o <span className="text-brown">{selectedPackage.name} - {selectedPackage.price}</span></p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  clearSelectedPackage();
                  toast.info("Seleção de plano removida");
                }}
              >
                Alterar
              </Button>
            </motion.div>
          )}

          <form onSubmit={handleFormSubmit}>

            <Card className="border-brown/10 overflow-hidden">
              <CardHeader className="border-b border-brown/10 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <CardTitle className="text-xl text-brown">Selecione os Detalhes</CardTitle>
                  <div className="mt-2 sm:mt-0 flex space-x-1 sm:space-x-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${currentStep >= 1 ? 'bg-brown text-white' : 'bg-gray-200'}`}>Serviço</span>
                    <span className={`px-2 py-1 rounded-full ${currentStep >= 2 ? 'bg-brown text-white' : 'bg-gray-200'}`}>Data</span>
                    <span className={`px-2 py-1 rounded-full ${currentStep >= 3 ? 'bg-brown text-white' : 'bg-gray-200'}`}>Detalhes</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-4 sm:p-6">
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-playfair">Selecione o Serviço</h3>
                      <div className="space-y-3">
                        {services.map((service) => (
                          <div
                            key={service.id}
                            onClick={() => handleServiceSelect(service.id)}
                            className={`p-4 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                              service.selected ? 'bg-brown/10 border border-brown/30' : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <Clock size={16} className="text-brown" />
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">{service.duration}</p>
                              </div>
                            </div>
                            <span className="font-medium">{service.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-playfair">Selecione a Data e Hora</h3>
                      <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                        <div className="w-full md:w-auto">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            initialFocus
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date < today;
                            }}
                            className="rounded-md border bg-white"
                            weekStartsOn={1}
                            showOutsideDays={true}
                            fixedWeeks={true}
                            numberOfMonths={1}
                          />
                          {selectedDate && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center"
                            >
                              <p className="text-sm font-medium text-green-800">
                                ✓ Data selecionada: {format(selectedDate, 'dd/MM/yyyy')}
                              </p>
                            </motion.div>
                          )}
                        </div>
                        {selectedDate && (
                          <motion.div 
                            className="w-full md:flex-1 p-4 border rounded-lg bg-brown/5"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <h4 className="font-medium mb-2 text-brown flex items-center">
                              Horários para {format(selectedDate, 'PPP')}
                              {isFetchingAvailability && (
                                <Loader2 className="ml-2 h-4 w-4 animate-spin text-blue-600" />
                              )}
                            </h4>
                            
                            {isFetchingAvailability ? (
                              <div className="space-y-3">
                                <div className="text-center py-8">
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-3" />
                                  <p className="text-sm text-muted-foreground">A verificar disponibilidade na agenda...</p>
                                  <p className="text-xs text-muted-foreground mt-1">Isto pode levar alguns segundos</p>
                                </div>
                              </div>
                            ) : availableTimes.length > 0 ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                  {availableTimes.map((time) => {
                                    const isSelected = selectedDate && selectedDate.getHours() === parseInt(time.split(":")[0]) && selectedDate.getMinutes() === parseInt(time.split(":")[1]);
                                    return (
                                      <motion.div
                                        key={time}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button
                                          variant={isSelected ? "sessionButton" : "outline"}
                                          className={`text-sm w-full transition-all duration-200 ${
                                            isSelected 
                                              ? '!bg-green-600 !text-white shadow-lg ring-2 ring-green-300' 
                                              : 'hover:bg-brown/10 hover:text-brown'
                                          }`}
                                          onClick={() => handleTimeSelect(time)}
                                        >
                                          {isSelected && '✓ '} {time}
                                        </Button>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                                <div className="text-xs text-green-600 bg-green-50 p-2 rounded text-center">
                                  ✓ Horários atualizados em tempo real
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-2">Nenhum horário disponível para esta data.</p>
                                <p className="text-xs text-muted-foreground">Por favor, selecione outra data.</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-playfair">Confirme os Seus Detalhes</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center">
                              <User className="mr-2 h-4 w-4" /> Nome Completo
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              type="text"
                              placeholder="Seu nome completo"
                              value={name}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                              required
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center">
                              <Mail className="mr-2 h-4 w-4" /> Email
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              placeholder="seu@email.com"
                              value={email}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                              required
                              className="bg-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="flex items-center">
                            <Phone className="mr-2 h-4 w-4" /> 
                            Telefone <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Input 
                            id="phone" 
                            name="phone" 
                            type="tel" 
                            placeholder="912345678" 
                            value={phone} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} 
                            required 
                            className="bg-white"
                            maxLength={9}
                          />
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Formato: 9XXXXXXXX (número português)</p>
                            <p className="text-amber-600 font-medium">
                              ⚠️ Este número será usado para enviar o pedido de pagamento via MB WAY
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sessionType">Tipo de Sessão</Label>
                          <select id="sessionType" name="sessionType" value={sessionType} onChange={(e) => setSessionType(e.target.value as 'Online' | 'Presencial')} className="w-full p-2 border rounded-md bg-white">
                            <option value="Online">Online</option>
                            <option value="Presencial">Presencial</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message" className="flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4" /> Mensagem (Opcional)
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            placeholder="Deixe uma nota ou questão..."
                            value={message}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="p-4 sm:px-6 bg-gray-50/50 border-t border-brown/10 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 1}
                >
                  Anterior
                </Button>

                {currentStep < 3 ? (
                  <Button onClick={handleNext} disabled={isNextDisabled()}>
                    Próximo
                  </Button>
                ) : (
                  <Button type="submit" disabled={isNextDisabled() || isSubmitting || hasSubmitted}>
                    {(isSubmitting) ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A Processar...</>
                    ) : hasSubmitted ? (
                      <><Loader2 className="mr-2 h-4 w-4" /> Enviado...</>
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </Button>
                )}
              </div>
            </Card>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default BookingTable;
