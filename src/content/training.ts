import type { Locale } from "@/i18n/config";

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

export interface TrainingContent {
  title: string;
  summary: string;
  sections: { title: string; body: string }[];
  quiz: QuizQuestion[];
}

export interface BuiltInModule {
  key: string;
  minutes: number;
  content: Record<Locale, TrainingContent>;
}

export const TRAINING_MODULES: BuiltInModule[] = [
  {
    key: "builtin:welcome",
    minutes: 4,
    content: {
      "pt-BR": {
        title: "Boas-vindas e postura",
        summary: "Como se apresentar e causar a primeira boa impressão.",
        sections: [
          { title: "Primeiros 10 segundos", body: "Faça contato visual, sorria e cumprimente o hóspede antes que ele fale. Interrompa o que estiver fazendo para dar atenção total." },
          { title: "Aparência", body: "Uniforme limpo e passado, crachá visível, cabelo arrumado e unhas cuidadas. Evite perfumes fortes e o uso do celular pessoal na frente do hóspede." },
          { title: "Linguagem", body: "Use “senhor” e “senhora” até o hóspede indicar outra forma. Nunca diga “não sei”: diga “vou verificar para o senhor” e retorne com a resposta." },
        ],
        quiz: [
          { q: "O hóspede chegou e você está digitando. O que fazer?", options: ["Terminar a tarefa e depois atender", "Parar, fazer contato visual e cumprimentar", "Pedir para ele aguardar sem olhar"], answer: 1 },
          { q: "Você não sabe a resposta para uma pergunta. O ideal é:", options: ["Dizer “não sei”", "Inventar uma resposta", "Dizer que vai verificar e retornar"], answer: 2 },
          { q: "Uso do celular pessoal na frente do hóspede:", options: ["Deve ser evitado", "É permitido se for rápido", "Não tem problema"], answer: 0 },
        ],
      },
      en: {
        title: "Welcome and posture",
        summary: "How to present yourself and make a great first impression.",
        sections: [
          { title: "The first 10 seconds", body: "Make eye contact, smile and greet the guest before they speak. Stop what you are doing and give them your full attention." },
          { title: "Appearance", body: "Clean, pressed uniform, visible name badge, tidy hair and neat nails. Avoid strong perfume and using your personal phone in front of guests." },
          { title: "Language", body: "Use “sir” or “madam” until the guest suggests otherwise. Never say “I don't know”: say “let me check that for you” and come back with the answer." },
        ],
        quiz: [
          { q: "A guest arrives while you are typing. What should you do?", options: ["Finish the task first", "Stop, make eye contact and greet them", "Ask them to wait without looking up"], answer: 1 },
          { q: "You don't know the answer to a question. The best response is:", options: ["Say “I don't know”", "Make up an answer", "Say you'll check and get back to them"], answer: 2 },
          { q: "Using your personal phone in front of guests:", options: ["Should be avoided", "Is fine if it's quick", "Is not a problem"], answer: 0 },
        ],
      },
      es: {
        title: "Bienvenida y postura",
        summary: "Cómo presentarte y causar una buena primera impresión.",
        sections: [
          { title: "Los primeros 10 segundos", body: "Haz contacto visual, sonríe y saluda al huésped antes de que hable. Deja lo que estés haciendo y préstale toda tu atención." },
          { title: "Apariencia", body: "Uniforme limpio y planchado, gafete visible, cabello ordenado y uñas cuidadas. Evita perfumes fuertes y usar tu celular personal frente al huésped." },
          { title: "Lenguaje", body: "Usa “señor” y “señora” hasta que el huésped indique otra forma. Nunca digas “no sé”: di “lo verifico para usted” y vuelve con la respuesta." },
        ],
        quiz: [
          { q: "Llega un huésped mientras escribes. ¿Qué haces?", options: ["Termino la tarea y luego atiendo", "Me detengo, hago contacto visual y saludo", "Le pido que espere sin mirarlo"], answer: 1 },
          { q: "No sabes la respuesta a una pregunta. Lo ideal es:", options: ["Decir “no sé”", "Inventar una respuesta", "Decir que lo verificarás y volver con la respuesta"], answer: 2 },
          { q: "Usar el celular personal frente al huésped:", options: ["Debe evitarse", "Se permite si es rápido", "No hay problema"], answer: 0 },
        ],
      },
    },
  },
  {
    key: "builtin:complaints",
    minutes: 5,
    content: {
      "pt-BR": {
        title: "Lidando com reclamações",
        summary: "O método OUVIR para transformar problemas em fidelidade.",
        sections: [
          { title: "Ouça sem interromper", body: "Deixe o hóspede falar até o fim. Mantenha a calma, acene com a cabeça e anote os detalhes importantes." },
          { title: "Peça desculpas e assuma", body: "Diga “sinto muito por isso” mesmo que a culpa não seja sua. Nunca culpe outro setor ou colega na frente do hóspede." },
          { title: "Resolva e acompanhe", body: "Ofereça uma solução concreta e um prazo. Registre no HotelFlow (ex.: chamado de manutenção) e volte para confirmar que tudo foi resolvido." },
        ],
        quiz: [
          { q: "Durante uma reclamação, você deve:", options: ["Interromper para explicar", "Ouvir até o fim", "Encaminhar logo para o gerente"], answer: 1 },
          { q: "O problema foi causado por outro setor. Você:", options: ["Explica que não é culpa sua", "Pede desculpas e cuida da solução", "Pede ao hóspede para reclamar lá"], answer: 1 },
          { q: "Depois de resolver, o ideal é:", options: ["Retornar para confirmar a satisfação", "Não tocar mais no assunto", "Oferecer desconto sempre"], answer: 0 },
        ],
      },
      en: {
        title: "Handling complaints",
        summary: "A simple method to turn problems into loyalty.",
        sections: [
          { title: "Listen without interrupting", body: "Let the guest finish. Stay calm, nod and write down the important details." },
          { title: "Apologize and take ownership", body: "Say “I'm sorry about this” even if it wasn't your fault. Never blame another department or colleague in front of the guest." },
          { title: "Solve and follow up", body: "Offer a concrete solution and a time frame. Log it in HotelFlow (e.g. a maintenance ticket) and come back to confirm everything is fixed." },
        ],
        quiz: [
          { q: "During a complaint, you should:", options: ["Interrupt to explain", "Listen until the end", "Send them straight to the manager"], answer: 1 },
          { q: "The problem was caused by another department. You:", options: ["Explain it's not your fault", "Apologize and handle the solution", "Tell the guest to complain there"], answer: 1 },
          { q: "After solving it, you should:", options: ["Follow up to confirm satisfaction", "Never mention it again", "Always offer a discount"], answer: 0 },
        ],
      },
      es: {
        title: "Manejo de quejas",
        summary: "Un método simple para convertir problemas en fidelidad.",
        sections: [
          { title: "Escucha sin interrumpir", body: "Deja que el huésped termine. Mantén la calma, asiente y anota los detalles importantes." },
          { title: "Discúlpate y hazte cargo", body: "Di “lamento lo ocurrido” aunque no sea tu culpa. Nunca culpes a otra área o colega frente al huésped." },
          { title: "Resuelve y da seguimiento", body: "Ofrece una solución concreta y un plazo. Regístralo en HotelFlow (p. ej., un ticket de mantenimiento) y vuelve para confirmar que se resolvió." },
        ],
        quiz: [
          { q: "Durante una queja, debes:", options: ["Interrumpir para explicar", "Escuchar hasta el final", "Enviarlo de inmediato al gerente"], answer: 1 },
          { q: "El problema lo causó otra área. Tú:", options: ["Explicas que no es tu culpa", "Te disculpas y te ocupas de la solución", "Le pides que se queje allá"], answer: 1 },
          { q: "Después de resolverlo, lo ideal es:", options: ["Volver para confirmar la satisfacción", "No volver a mencionarlo", "Ofrecer siempre un descuento"], answer: 0 },
        ],
      },
    },
  },
  {
    key: "builtin:safety",
    minutes: 4,
    content: {
      "pt-BR": {
        title: "Segurança e emergências",
        summary: "O que fazer em incêndio, acidente ou mal-estar de hóspede.",
        sections: [
          { title: "Conheça as rotas", body: "Saiba onde ficam as saídas de emergência, extintores e o ponto de encontro. Nunca bloqueie corredores e portas corta-fogo." },
          { title: "Em caso de incêndio", body: "Acione o alarme, avise a recepção e ajude na evacuação pelas escadas. Não use o elevador e não volte para buscar objetos." },
          { title: "Mal-estar ou acidente", body: "Mantenha a calma, não mova a pessoa se houver suspeita de queda grave e ligue 192 (SAMU) ou 193 (Bombeiros). Avise o supervisor." },
        ],
        quiz: [
          { q: "Em um incêndio, o hóspede deve sair:", options: ["Pelo elevador", "Pelas escadas", "Pela janela"], answer: 1 },
          { q: "O número do SAMU é:", options: ["190", "192", "199"], answer: 1 },
          { q: "Portas corta-fogo devem ficar:", options: ["Fechadas e desobstruídas", "Abertas com calço", "Trancadas à chave"], answer: 0 },
        ],
      },
      en: {
        title: "Safety and emergencies",
        summary: "What to do in a fire, an accident or if a guest feels unwell.",
        sections: [
          { title: "Know the routes", body: "Know where the emergency exits, fire extinguishers and meeting point are. Never block hallways or fire doors." },
          { title: "In case of fire", body: "Trigger the alarm, notify the front desk and help evacuate using the stairs. Do not use the elevator and never go back for belongings." },
          { title: "Illness or accident", body: "Stay calm, do not move the person if a serious fall is suspected, and call emergency services (192 ambulance or 193 fire in Brazil). Inform your supervisor." },
        ],
        quiz: [
          { q: "During a fire, guests should leave by:", options: ["The elevator", "The stairs", "The window"], answer: 1 },
          { q: "In Brazil, the ambulance number is:", options: ["190", "192", "199"], answer: 1 },
          { q: "Fire doors should be:", options: ["Closed and unobstructed", "Propped open", "Locked with a key"], answer: 0 },
        ],
      },
      es: {
        title: "Seguridad y emergencias",
        summary: "Qué hacer ante un incendio, un accidente o un malestar de un huésped.",
        sections: [
          { title: "Conoce las rutas", body: "Ubica las salidas de emergencia, los extintores y el punto de encuentro. Nunca bloquees pasillos ni puertas cortafuego." },
          { title: "En caso de incendio", body: "Activa la alarma, avisa a recepción y ayuda a evacuar por las escaleras. No uses el ascensor y no vuelvas por objetos." },
          { title: "Malestar o accidente", body: "Mantén la calma, no muevas a la persona si sospechas una caída grave y llama a emergencias (en Brasil, 192 ambulancia o 193 bomberos). Avisa al supervisor." },
        ],
        quiz: [
          { q: "En un incendio, el huésped debe salir por:", options: ["El ascensor", "Las escaleras", "La ventana"], answer: 1 },
          { q: "En Brasil, el número de la ambulancia es:", options: ["190", "192", "199"], answer: 1 },
          { q: "Las puertas cortafuego deben estar:", options: ["Cerradas y despejadas", "Abiertas con una cuña", "Cerradas con llave"], answer: 0 },
        ],
      },
    },
  },
  {
    key: "builtin:room-standard",
    minutes: 5,
    content: {
      "pt-BR": {
        title: "Padrão do quarto",
        summary: "A ordem certa da arrumação e o que nunca pode faltar.",
        sections: [
          { title: "Ordem da arrumação", body: "Ventile o quarto, retire lixo e enxoval usado, arrume a cama, limpe de cima para baixo, higienize o banheiro e termine pelo piso." },
          { title: "Itens obrigatórios", body: "Toalhas dobradas no padrão do hotel, amenities completos, copos higienizados, controle remoto limpo e frigobar conferido." },
          { title: "Atenção aos detalhes", body: "Teste luzes, TV e ar-condicionado. Avarias viram chamado de manutenção no HotelFlow e objetos esquecidos vão para Achados e perdidos." },
        ],
        quiz: [
          { q: "A limpeza deve ser feita:", options: ["De baixo para cima", "De cima para baixo", "Em qualquer ordem"], answer: 1 },
          { q: "Encontrou uma lâmpada queimada. Você:", options: ["Abre um chamado de manutenção", "Ignora", "Avisa só no fim do mês"], answer: 0 },
          { q: "Objeto esquecido pelo hóspede deve ser:", options: ["Descartado", "Registrado em Achados e perdidos", "Deixado no quarto"], answer: 1 },
        ],
      },
      en: {
        title: "Room standard",
        summary: "The right cleaning order and what must never be missing.",
        sections: [
          { title: "Cleaning order", body: "Air out the room, remove trash and used linen, make the bed, clean from top to bottom, sanitize the bathroom and finish with the floor." },
          { title: "Must-have items", body: "Towels folded to the hotel standard, complete amenities, sanitized glasses, clean remote control and a checked minibar." },
          { title: "Attention to detail", body: "Test lights, TV and air conditioning. Damages become a maintenance ticket in HotelFlow, and forgotten items go to Lost and found." },
        ],
        quiz: [
          { q: "Cleaning should be done:", options: ["From bottom to top", "From top to bottom", "In any order"], answer: 1 },
          { q: "You find a burnt-out bulb. You:", options: ["Open a maintenance ticket", "Ignore it", "Report it at the end of the month"], answer: 0 },
          { q: "An item left behind by a guest should be:", options: ["Thrown away", "Logged in Lost and found", "Left in the room"], answer: 1 },
        ],
      },
      es: {
        title: "Estándar de la habitación",
        summary: "El orden correcto de la limpieza y lo que nunca puede faltar.",
        sections: [
          { title: "Orden de la limpieza", body: "Ventila la habitación, retira basura y ropa de cama usada, tiende la cama, limpia de arriba hacia abajo, desinfecta el baño y termina con el piso." },
          { title: "Artículos obligatorios", body: "Toallas dobladas según el estándar del hotel, amenities completos, vasos desinfectados, control remoto limpio y minibar revisado." },
          { title: "Atención a los detalles", body: "Prueba luces, TV y aire acondicionado. Los daños se convierten en ticket de mantenimiento en HotelFlow y los objetos olvidados van a Objetos perdidos." },
        ],
        quiz: [
          { q: "La limpieza se hace:", options: ["De abajo hacia arriba", "De arriba hacia abajo", "En cualquier orden"], answer: 1 },
          { q: "Encuentras un foco fundido. Tú:", options: ["Abres un ticket de mantenimiento", "Lo ignoras", "Avisas a fin de mes"], answer: 0 },
          { q: "Un objeto olvidado por el huésped debe:", options: ["Desecharse", "Registrarse en Objetos perdidos", "Dejarse en la habitación"], answer: 1 },
        ],
      },
    },
  },
  {
    key: "builtin:privacy",
    minutes: 3,
    content: {
      "pt-BR": {
        title: "Privacidade e LGPD",
        summary: "Como proteger os dados e a segurança dos hóspedes.",
        sections: [
          { title: "Nunca informe o quarto", body: "Não diga o número do quarto de um hóspede em voz alta nem a terceiros. Ofereça-se para ligar para o quarto e avisar que há alguém procurando por ele." },
          { title: "Documentos e fichas", body: "Fichas e cópias de documentos ficam guardadas e longe da vista do público. Não fotografe documentos com o seu celular pessoal." },
          { title: "Acesso ao sistema", body: "Sua senha é pessoal. Bloqueie a tela ao sair do balcão e saia da conta em aparelhos compartilhados." },
        ],
        quiz: [
          { q: "Alguém pergunta em qual quarto está um hóspede. Você:", options: ["Informa o número", "Liga para o quarto e avisa o hóspede", "Mostra a lista de hóspedes"], answer: 1 },
          { q: "Fotografar documentos com o celular pessoal é:", options: ["Proibido", "Permitido para agilizar", "Obrigatório"], answer: 0 },
          { q: "Ao sair do balcão você deve:", options: ["Deixar a tela aberta", "Bloquear a tela", "Desligar a internet"], answer: 1 },
        ],
      },
      en: {
        title: "Privacy and data protection",
        summary: "How to protect guests' data and safety.",
        sections: [
          { title: "Never disclose room numbers", body: "Don't say a guest's room number out loud or to third parties. Offer to call the room and let the guest know someone is asking for them." },
          { title: "Documents and forms", body: "Registration forms and document copies must be stored away from public view. Never photograph documents with your personal phone." },
          { title: "System access", body: "Your password is personal. Lock the screen when you leave the desk and sign out on shared devices." },
        ],
        quiz: [
          { q: "Someone asks which room a guest is in. You:", options: ["Tell them the number", "Call the room and inform the guest", "Show the guest list"], answer: 1 },
          { q: "Photographing documents with your personal phone is:", options: ["Forbidden", "Allowed to save time", "Mandatory"], answer: 0 },
          { q: "When you leave the desk you should:", options: ["Leave the screen open", "Lock the screen", "Turn off the internet"], answer: 1 },
        ],
      },
      es: {
        title: "Privacidad y protección de datos",
        summary: "Cómo proteger los datos y la seguridad de los huéspedes.",
        sections: [
          { title: "Nunca informes la habitación", body: "No digas en voz alta ni a terceros el número de habitación de un huésped. Ofrece llamar a la habitación para avisarle que alguien lo busca." },
          { title: "Documentos y fichas", body: "Las fichas y copias de documentos deben guardarse lejos de la vista del público. No fotografíes documentos con tu celular personal." },
          { title: "Acceso al sistema", body: "Tu contraseña es personal. Bloquea la pantalla al dejar el mostrador y cierra sesión en dispositivos compartidos." },
        ],
        quiz: [
          { q: "Alguien pregunta en qué habitación está un huésped. Tú:", options: ["Le das el número", "Llamas a la habitación y avisas al huésped", "Muestras la lista de huéspedes"], answer: 1 },
          { q: "Fotografiar documentos con el celular personal está:", options: ["Prohibido", "Permitido para agilizar", "Obligado"], answer: 0 },
          { q: "Al dejar el mostrador debes:", options: ["Dejar la pantalla abierta", "Bloquear la pantalla", "Apagar internet"], answer: 1 },
        ],
      },
    },
  },
];

/** Converte o texto livre de um módulo do hotel em seções. */
export function parseCustomContent(content: string): { title: string; body: string }[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [first, ...rest] = block.split("\n");
      return rest.length ? { title: first.trim(), body: rest.join("\n").trim() } : { title: "", body: first.trim() };
    });
}
