import type { Locale } from "@/i18n/config";

export type PhraseCategory =
  | "greetings"
  | "checkin"
  | "checkout"
  | "room"
  | "directions"
  | "restaurant"
  | "problems"
  | "emergency"
  | "payment";

export interface Phrase {
  id: string;
  category: PhraseCategory | "custom";
  text: Record<Locale, string>;
}

export const PHRASE_CATEGORIES: PhraseCategory[] = [
  "greetings",
  "checkin",
  "checkout",
  "room",
  "directions",
  "restaurant",
  "problems",
  "emergency",
  "payment",
];

const p = (id: string, category: PhraseCategory, pt: string, en: string, es: string): Phrase => ({
  id,
  category,
  text: { "pt-BR": pt, en, es },
});

/** Somente português, inglês e espanhol. */
export const PHRASES: Phrase[] = [
  // Boas-vindas
  p("g1", "greetings", "Bom dia! Seja bem-vindo ao hotel.", "Good morning! Welcome to the hotel.", "¡Buenos días! Bienvenido al hotel."),
  p("g2", "greetings", "Boa tarde! Como posso ajudar?", "Good afternoon! How can I help you?", "¡Buenas tardes! ¿En qué puedo ayudarle?"),
  p("g3", "greetings", "Boa noite! Em que posso ser útil?", "Good evening! How may I help you?", "¡Buenas noches! ¿En qué le puedo servir?"),
  p("g4", "greetings", "Um momento, por favor.", "One moment, please.", "Un momento, por favor."),
  p("g5", "greetings", "Pode repetir mais devagar, por favor?", "Could you repeat that more slowly, please?", "¿Puede repetirlo más despacio, por favor?"),
  p("g6", "greetings", "Tenha uma ótima estadia!", "Have a wonderful stay!", "¡Que tenga una excelente estadía!"),

  // Check-in
  p("ci1", "checkin", "Posso ver seu documento de identidade ou passaporte?", "May I see your ID or passport?", "¿Me permite su documento de identidad o pasaporte?"),
  p("ci2", "checkin", "Sua reserva está em qual nome?", "What name is the reservation under?", "¿A nombre de quién está la reserva?"),
  p("ci3", "checkin", "O check-in é a partir das 14h e o check-out até as 12h.", "Check-in is from 2 p.m. and check-out is by 12 p.m.", "El check-in es a partir de las 14 h y el check-out hasta las 12 h."),
  p("ci4", "checkin", "O café da manhã é servido das 6h30 às 10h.", "Breakfast is served from 6:30 to 10 a.m.", "El desayuno se sirve de 6:30 a 10 h."),
  p("ci5", "checkin", "Esta é a senha do Wi-Fi.", "This is the Wi-Fi password.", "Esta es la contraseña del Wi-Fi."),
  p("ci6", "checkin", "Este é o cartão do seu quarto. O elevador fica à esquerda.", "This is your room key card. The elevator is on the left.", "Esta es la tarjeta de su habitación. El ascensor está a la izquierda."),
  p("ci7", "checkin", "Por favor, preencha e assine esta ficha.", "Please fill out and sign this form.", "Por favor, complete y firme esta ficha."),

  // Check-out
  p("co1", "checkout", "Gostaria de fazer o check-out?", "Would you like to check out?", "¿Desea hacer el check-out?"),
  p("co2", "checkout", "Consumiu algo do frigobar?", "Did you take anything from the minibar?", "¿Consumió algo del minibar?"),
  p("co3", "checkout", "Aqui está o resumo da sua conta.", "Here is a summary of your bill.", "Aquí tiene el resumen de su cuenta."),
  p("co4", "checkout", "Podemos guardar sua bagagem até a hora da partida.", "We can store your luggage until you leave.", "Podemos guardar su equipaje hasta su salida."),
  p("co5", "checkout", "Deseja que chamemos um táxi?", "Would you like us to call a taxi?", "¿Desea que le pidamos un taxi?"),
  p("co6", "checkout", "Obrigado pela preferência. Volte sempre!", "Thank you for staying with us. Come back soon!", "Gracias por su preferencia. ¡Vuelva pronto!"),

  // Quarto
  p("r1", "room", "Deseja que façamos a arrumação do quarto agora?", "Would you like us to clean your room now?", "¿Desea que arreglemos la habitación ahora?"),
  p("r2", "room", "Vou trazer toalhas limpas.", "I'll bring you clean towels.", "Le traeré toallas limpias."),
  p("r3", "room", "O controle do ar-condicionado fica ao lado da cama.", "The air conditioning remote is next to the bed.", "El control del aire acondicionado está junto a la cama."),
  p("r4", "room", "O cofre fica dentro do armário.", "The safe is inside the wardrobe.", "La caja fuerte está dentro del armario."),
  p("r5", "room", "Precisa de travesseiro ou cobertor extra?", "Do you need an extra pillow or blanket?", "¿Necesita una almohada o manta extra?"),
  p("r6", "room", "Com licença, posso entrar?", "Excuse me, may I come in?", "Con permiso, ¿puedo pasar?"),

  // Direções
  p("d1", "directions", "O elevador fica à direita.", "The elevator is on the right.", "El ascensor está a la derecha."),
  p("d2", "directions", "O restaurante fica no térreo.", "The restaurant is on the ground floor.", "El restaurante está en la planta baja."),
  p("d3", "directions", "A piscina funciona das 8h às 20h.", "The pool is open from 8 a.m. to 8 p.m.", "La piscina funciona de 8 a 20 h."),
  p("d4", "directions", "Siga em frente e vire à esquerda.", "Go straight ahead and turn left.", "Siga derecho y gire a la izquierda."),
  p("d5", "directions", "A farmácia mais próxima fica a duas quadras.", "The nearest pharmacy is two blocks away.", "La farmacia más cercana está a dos cuadras."),
  p("d6", "directions", "Posso chamar um táxi ou carro por aplicativo.", "I can call you a taxi or a ride-share car.", "Puedo pedirle un taxi o un auto por aplicación."),

  // Restaurante
  p("f1", "restaurant", "Mesa para quantas pessoas?", "A table for how many people?", "¿Mesa para cuántas personas?"),
  p("f2", "restaurant", "Possui alguma alergia ou restrição alimentar?", "Do you have any allergies or dietary restrictions?", "¿Tiene alguna alergia o restricción alimentaria?"),
  p("f3", "restaurant", "Aqui está o cardápio.", "Here is the menu.", "Aquí tiene el menú."),
  p("f4", "restaurant", "O serviço de quarto funciona 24 horas.", "Room service is available 24 hours.", "El servicio a la habitación funciona las 24 horas."),
  p("f5", "restaurant", "Deseja colocar na conta do quarto?", "Would you like to charge it to your room?", "¿Desea cargarlo a la cuenta de la habitación?"),

  // Problemas
  p("p1", "problems", "Sinto muito pelo transtorno.", "I'm very sorry for the inconvenience.", "Lamento mucho las molestias."),
  p("p2", "problems", "Vou chamar a manutenção imediatamente.", "I'll call maintenance right away.", "Voy a llamar a mantenimiento de inmediato."),
  p("p3", "problems", "Podemos trocar o seu quarto.", "We can move you to another room.", "Podemos cambiarle de habitación."),
  p("p4", "problems", "Vou verificar e retorno em alguns minutos.", "I'll check and get back to you in a few minutes.", "Lo verifico y le respondo en unos minutos."),
  p("p5", "problems", "Pode me mostrar qual é o problema?", "Could you show me what the problem is?", "¿Puede mostrarme cuál es el problema?"),
  p("p6", "problems", "Encontramos um objeto que pode ser seu.", "We found an item that may be yours.", "Encontramos un objeto que podría ser suyo."),

  // Emergência
  p("e1", "emergency", "Você precisa de um médico?", "Do you need a doctor?", "¿Necesita un médico?"),
  p("e2", "emergency", "Vou chamar uma ambulância agora.", "I'm calling an ambulance now.", "Voy a llamar a una ambulancia ahora."),
  p("e3", "emergency", "Por favor, mantenha a calma e me acompanhe.", "Please stay calm and follow me.", "Por favor, mantenga la calma y acompáñeme."),
  p("e4", "emergency", "A saída de emergência fica no fim do corredor.", "The emergency exit is at the end of the hallway.", "La salida de emergencia está al final del pasillo."),
  p("e5", "emergency", "Não use o elevador.", "Do not use the elevator.", "No use el ascensor."),

  // Pagamento
  p("$1", "payment", "Aceitamos cartão de crédito, débito e Pix.", "We accept credit cards, debit cards and Pix.", "Aceptamos tarjeta de crédito, débito y Pix."),
  p("$2", "payment", "Deseja pagar à vista ou parcelado?", "Would you like to pay in full or in installments?", "¿Desea pagar al contado o en cuotas?"),
  p("$3", "payment", "Precisa de nota fiscal com CPF ou CNPJ?", "Do you need an invoice with a tax ID?", "¿Necesita factura con número fiscal?"),
  p("$4", "payment", "Insira o cartão e digite a senha, por favor.", "Please insert your card and enter your PIN.", "Inserte la tarjeta e ingrese su clave, por favor."),
  p("$5", "payment", "A taxa de turismo já está incluída.", "The tourist tax is already included.", "La tasa turística ya está incluida."),
];
