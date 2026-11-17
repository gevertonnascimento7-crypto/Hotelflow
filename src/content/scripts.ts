import type { Locale } from "@/i18n/config";

type L = Record<Locale, string>;

export interface ScriptStep {
  /** Orientação para o colaborador (no idioma da interface). */
  instruction: L;
  /** Fala para o hóspede (no idioma escolhido do hóspede). */
  say?: L;
}

export interface BuiltInScript {
  key: string;
  title: L;
  situation: L;
  steps: ScriptStep[];
}

const l = (pt: string, en: string, es: string): L => ({ "pt-BR": pt, en, es });

export const SERVICE_SCRIPTS: BuiltInScript[] = [
  {
    key: "checkin",
    title: l("Check-in", "Check-in", "Check-in"),
    situation: l("Chegada do hóspede com reserva.", "Guest arriving with a reservation.", "Llegada del huésped con reserva."),
    steps: [
      { instruction: l("Cumprimente com contato visual e sorriso.", "Greet with eye contact and a smile.", "Saluda con contacto visual y una sonrisa."), say: l("Bem-vindo! Como posso ajudar?", "Welcome! How can I help you?", "¡Bienvenido! ¿En qué puedo ayudarle?") },
      { instruction: l("Confirme a reserva e peça o documento.", "Confirm the reservation and ask for ID.", "Confirma la reserva y pide el documento."), say: l("A reserva está em qual nome? Posso ver seu documento, por favor?", "What name is the reservation under? May I see your ID, please?", "¿A nombre de quién está la reserva? ¿Me permite su documento, por favor?") },
      { instruction: l("Confirme datas, tipo de quarto e forma de pagamento.", "Confirm dates, room type and payment method.", "Confirma fechas, tipo de habitación y forma de pago."), say: l("Sua estadia é de hoje até sexta-feira, em quarto duplo. Correto?", "Your stay is from today until Friday, in a double room. Is that correct?", "Su estadía es de hoy hasta el viernes, en habitación doble. ¿Correcto?") },
      { instruction: l("Explique horários e senha do Wi-Fi.", "Explain schedules and the Wi-Fi password.", "Explica horarios y la contraseña del Wi-Fi."), say: l("O café da manhã é das 6h30 às 10h, e esta é a senha do Wi-Fi.", "Breakfast is from 6:30 to 10 a.m., and this is the Wi-Fi password.", "El desayuno es de 6:30 a 10 h, y esta es la contraseña del Wi-Fi.") },
      { instruction: l("Entregue a chave e indique o caminho.", "Hand over the key and give directions.", "Entrega la llave e indica el camino."), say: l("Seu quarto fica no terceiro andar. O elevador é à direita.", "Your room is on the third floor. The elevator is on the right.", "Su habitación está en el tercer piso. El ascensor está a la derecha.") },
      { instruction: l("Encerre se colocando à disposição.", "Close by offering further help.", "Cierra ofreciendo ayuda."), say: l("Qualquer coisa, é só ligar para a recepção. Boa estadia!", "If you need anything, just call the front desk. Enjoy your stay!", "Cualquier cosa, llame a recepción. ¡Buena estadía!") },
    ],
  },
  {
    key: "checkout",
    title: l("Check-out", "Check-out", "Check-out"),
    situation: l("Saída do hóspede e fechamento da conta.", "Guest departure and settling the bill.", "Salida del huésped y cierre de cuenta."),
    steps: [
      { instruction: l("Cumprimente e pergunte sobre a estadia.", "Greet and ask about the stay.", "Saluda y pregunta por la estadía."), say: l("Bom dia! Como foi a sua estadia?", "Good morning! How was your stay?", "¡Buenos días! ¿Cómo estuvo su estadía?") },
      { instruction: l("Confirme consumos do frigobar e extras.", "Confirm minibar and extra charges.", "Confirma consumos del minibar y extras."), say: l("O senhor consumiu algo do frigobar?", "Did you take anything from the minibar?", "¿Consumió algo del minibar?") },
      { instruction: l("Apresente a conta e confirme o pagamento.", "Present the bill and confirm payment.", "Presenta la cuenta y confirma el pago."), say: l("Aqui está o resumo da conta. Como prefere pagar?", "Here is your bill summary. How would you like to pay?", "Aquí tiene el resumen de la cuenta. ¿Cómo prefiere pagar?") },
      { instruction: l("Ofereça guarda de bagagem e transporte.", "Offer luggage storage and transport.", "Ofrece guardar el equipaje y transporte."), say: l("Deseja guardar a bagagem ou que chamemos um táxi?", "Would you like to store your luggage or have us call a taxi?", "¿Desea guardar el equipaje o que le pidamos un taxi?") },
      { instruction: l("Agradeça e convide para voltar.", "Thank them and invite them back.", "Agradece e invita a volver."), say: l("Obrigado pela preferência. Volte sempre!", "Thank you for staying with us. Come back soon!", "Gracias por su preferencia. ¡Vuelva pronto!") },
    ],
  },
  {
    key: "complaint",
    title: l("Reclamação", "Complaint", "Queja"),
    situation: l("Hóspede insatisfeito no balcão.", "Unhappy guest at the desk.", "Huésped insatisfecho en el mostrador."),
    steps: [
      { instruction: l("Ouça sem interromper e mantenha a calma.", "Listen without interrupting and stay calm.", "Escucha sin interrumpir y mantén la calma.") },
      { instruction: l("Peça desculpas com sinceridade.", "Apologize sincerely.", "Discúlpate con sinceridad."), say: l("Sinto muito pelo transtorno. Vou resolver isso agora.", "I'm very sorry for the inconvenience. I'll take care of it now.", "Lamento mucho las molestias. Lo resolveré ahora mismo.") },
      { instruction: l("Confirme o problema com suas palavras.", "Confirm the problem in your own words.", "Confirma el problema con tus palabras."), say: l("Então o ar-condicionado não está gelando, correto?", "So the air conditioning isn't cooling, is that right?", "Entonces el aire acondicionado no enfría, ¿correcto?") },
      { instruction: l("Ofereça solução e prazo. Abra um chamado no HotelFlow.", "Offer a solution and time frame. Open a ticket in HotelFlow.", "Ofrece solución y plazo. Abre un ticket en HotelFlow."), say: l("A manutenção estará no seu quarto em 15 minutos. Se preferir, podemos trocar de quarto.", "Maintenance will be in your room in 15 minutes. If you prefer, we can move you to another room.", "Mantenimiento estará en su habitación en 15 minutos. Si prefiere, podemos cambiarle de habitación.") },
      { instruction: l("Retorne depois para confirmar.", "Follow up afterwards.", "Vuelve después para confirmar."), say: l("Passando para confirmar: ficou tudo resolvido?", "Just checking in: is everything sorted now?", "Paso a confirmar: ¿quedó todo resuelto?") },
    ],
  },
  {
    key: "late-checkout",
    title: l("Late check-out", "Late check-out", "Late check-out"),
    situation: l("Hóspede pede para sair mais tarde.", "Guest asks to leave later.", "El huésped pide salir más tarde."),
    steps: [
      { instruction: l("Verifique a ocupação do dia antes de responder.", "Check today's occupancy before answering.", "Revisa la ocupación del día antes de responder."), say: l("Vou verificar a disponibilidade para o senhor.", "Let me check availability for you.", "Voy a verificar la disponibilidad para usted.") },
      { instruction: l("Se houver disponibilidade, informe horário e tarifa.", "If available, state the time and rate.", "Si hay disponibilidad, informa horario y tarifa."), say: l("Podemos estender até as 15h, com taxa de meia diária.", "We can extend until 3 p.m. for a half-day rate.", "Podemos extender hasta las 15 h, con tarifa de media noche.") },
      { instruction: l("Se não houver, ofereça alternativas.", "If not available, offer alternatives.", "Si no hay, ofrece alternativas."), say: l("Hoje não será possível, mas podemos guardar sua bagagem e o senhor pode usar a piscina.", "It won't be possible today, but we can store your luggage and you're welcome to use the pool.", "Hoy no será posible, pero podemos guardar su equipaje y puede usar la piscina.") },
      { instruction: l("Registre o novo horário no sistema e avise a governança.", "Record the new time and inform housekeeping.", "Registra el nuevo horario y avisa a ama de llaves.") },
    ],
  },
  {
    key: "phone",
    title: l("Atendimento telefônico", "Answering the phone", "Atención telefónica"),
    situation: l("Ligações para a recepção.", "Calls to the front desk.", "Llamadas a recepción."),
    steps: [
      { instruction: l("Atenda em até 3 toques, com sorriso na voz.", "Answer within 3 rings, with a smile in your voice.", "Atiende antes del 3.er timbre, con una sonrisa en la voz."), say: l("Hotel, recepção, bom dia! Em que posso ajudar?", "Hotel front desk, good morning! How may I help you?", "Hotel, recepción, ¡buenos días! ¿En qué puedo ayudarle?") },
      { instruction: l("Pergunte o nome e use-o na conversa.", "Ask for their name and use it.", "Pregunta el nombre y úsalo en la conversación."), say: l("Com quem eu falo, por favor?", "May I have your name, please?", "¿Con quién hablo, por favor?") },
      { instruction: l("Se precisar transferir ou pausar, peça permissão.", "Ask permission before transferring or holding.", "Pide permiso antes de transferir o poner en espera."), say: l("Posso colocá-lo em espera por um minuto?", "May I put you on hold for a minute?", "¿Puedo ponerlo en espera un minuto?") },
      { instruction: l("Anote recados com nome, número e horário.", "Take messages with name, number and time.", "Anota recados con nombre, número y hora.") },
      { instruction: l("Encerre de forma cordial.", "End the call politely.", "Cierra de forma cordial."), say: l("Obrigado pela ligação. Tenha um ótimo dia!", "Thank you for calling. Have a great day!", "Gracias por llamar. ¡Que tenga un excelente día!") },
    ],
  },
  {
    key: "room-not-ready",
    title: l("Quarto não está pronto", "Room not ready", "Habitación no lista"),
    situation: l("Hóspede chega antes do quarto ser liberado.", "Guest arrives before the room is ready.", "El huésped llega antes de que la habitación esté lista."),
    steps: [
      { instruction: l("Peça desculpas e informe uma previsão realista.", "Apologize and give a realistic estimate.", "Discúlpate e informa un tiempo realista."), say: l("Seu quarto estará pronto em aproximadamente 30 minutos.", "Your room will be ready in about 30 minutes.", "Su habitación estará lista en aproximadamente 30 minutos.") },
      { instruction: l("Ofereça guardar a bagagem e um espaço de espera.", "Offer to store luggage and a place to wait.", "Ofrece guardar el equipaje y un lugar de espera."), say: l("Podemos guardar suas malas. Fique à vontade no lobby ou no bar.", "We can keep your bags. Please make yourself comfortable in the lobby or the bar.", "Podemos guardar sus maletas. Póngase cómodo en el lobby o en el bar.") },
      { instruction: l("Peça prioridade à governança pelo HotelFlow.", "Ask housekeeping for priority via HotelFlow.", "Pide prioridad a ama de llaves por HotelFlow.") },
      { instruction: l("Avise o hóspede assim que o quarto for liberado.", "Let the guest know as soon as the room is ready.", "Avisa al huésped en cuanto la habitación esté lista."), say: l("Seu quarto está pronto! Obrigado pela paciência.", "Your room is ready! Thank you for your patience.", "¡Su habitación está lista! Gracias por su paciencia.") },
    ],
  },
];

/** Passos de roteiros personalizados: "orientação | fala". */
export interface CustomStep {
  instruction: string;
  say?: string;
}

export function parseCustomSteps(text: string): CustomStep[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [instruction, ...rest] = line.split("|");
      const say = rest.join("|").trim();
      return say ? { instruction: instruction.trim(), say } : { instruction: instruction.trim() };
    });
}
