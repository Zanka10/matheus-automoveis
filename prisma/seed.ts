/* Dados iniciais da loja. Executar: npm run db:seed
   Idempotente para usuários/marcas/configurações; veículos de exemplo só são criados se o estoque estiver vazio. */
import { PrismaClient, type FuelType, type Transmission, type VehicleStatus, type QuoteStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slugify = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

const CATEGORIES = ["SUV", "Sedã", "Hatch", "Picape", "Esportivo", "Utilitário"];

const BRANDS: Record<string, [string, string][]> = {
  Toyota: [["Corolla", "Sedã"], ["Corolla Cross", "SUV"], ["Hilux", "Picape"], ["Yaris", "Hatch"]],
  Volkswagen: [["Nivus", "SUV"], ["T-Cross", "SUV"], ["Polo", "Hatch"], ["Amarok", "Picape"], ["Jetta", "Sedã"]],
  Jeep: [["Compass", "SUV"], ["Renegade", "SUV"], ["Commander", "SUV"]],
  Honda: [["Civic", "Sedã"], ["HR-V", "SUV"], ["City", "Sedã"]],
  Chevrolet: [["Onix", "Hatch"], ["Tracker", "SUV"], ["S10", "Picape"]],
  BMW: [["320i", "Sedã"], ["X1", "SUV"], ["X5", "SUV"]],
  "Mercedes-Benz": [["C 300", "Sedã"], ["GLA 200", "SUV"]],
  Porsche: [["911", "Esportivo"], ["Macan", "SUV"]],
  Hyundai: [["Creta", "SUV"], ["HB20", "Hatch"]],
  Fiat: [["Toro", "Picape"], ["Pulse", "SUV"], ["Strada", "Picape"]],
  Audi: [["A3 Sedan", "Sedã"], ["Q5", "SUV"]],
  Ford: [["Ranger", "Picape"], ["Mustang", "Esportivo"]],
};

type SeedVehicle = {
  brand: string;
  model: string;
  version: string;
  year: [number, number];
  condition: "NEW" | "USED";
  mileage: number;
  price: number;
  promo?: number;
  fuel: FuelType;
  transmission: Transmission;
  engine: string;
  power: string;
  color: string;
  doors: number;
  seats: number;
  drivetrain: string;
  consumption: string;
  status: VehicleStatus;
  featured?: boolean;
  offer?: string;
  published?: boolean;
  images: string[];
  createdDaysAgo: number;
  soldDaysAgo?: number;
};

const COMMON_FEATURES = [
  "Ar-condicionado digital",
  "Direção elétrica",
  "Central multimídia com Android Auto e Apple CarPlay",
  "Câmera de ré",
  "Sensor de estacionamento",
  "Controle de estabilidade e tração",
  "Airbags frontais e laterais",
  "Faróis em LED",
  "Rodas de liga leve",
  "Piloto automático",
  "Chave presencial e partida por botão",
  "Retrovisores elétricos rebatíveis",
];
const PREMIUM_FEATURES = [
  "Bancos em couro com ajuste elétrico",
  "Teto solar panorâmico",
  "Painel de instrumentos digital",
  "Carregador de celular por indução",
  "Controle de cruzeiro adaptativo",
  "Alerta de ponto cego",
  "Frenagem autônoma de emergência",
  "Som premium",
];

const VEHICLES: SeedVehicle[] = [
  { brand: "Porsche", model: "911", version: "Carrera S 3.0 Biturbo PDK", year: [2022, 2023], condition: "USED", mileage: 8900, price: 1189000, fuel: "GASOLINE", transmission: "DCT", engine: "3.0 Boxer biturbo", power: "450 cv", color: "Cinza Ágata", doors: 2, seats: 4, drivetrain: "Traseira", consumption: "8,4 km/l (cidade) / 11,2 km/l (estrada)", status: "AVAILABLE", featured: true, images: ["1503376780353-7e6692767b70", "1614162692292-7ac56d7f7f1e", "1580273916550-e323be2ae537"], createdDaysAgo: 12 },
  { brand: "BMW", model: "X5", version: "xDrive45e M Sport Híbrido", year: [2023, 2024], condition: "USED", mileage: 15400, price: 589900, promo: 559900, fuel: "HYBRID", transmission: "AUTOMATIC", engine: "3.0 6 cilindros turbo + elétrico", power: "394 cv", color: "Preto Safira", doors: 4, seats: 5, drivetrain: "Integral", consumption: "Até 25 km/l (modo híbrido)", status: "AVAILABLE", featured: true, offer: "Condição especial", images: ["1555215695-3004980ad54e", "1605559424843-9e4c228bf1c2", "1617531653332-bd46c24f2068"], createdDaysAgo: 20 },
  { brand: "Toyota", model: "Corolla Cross", version: "XRX Hybrid 1.8 CVT", year: [2025, 2025], condition: "NEW", mileage: 0, price: 199990, fuel: "HYBRID", transmission: "CVT", engine: "1.8 Híbrido", power: "122 cv", color: "Branco Lunar", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "17,8 km/l (cidade)", status: "AVAILABLE", featured: true, images: ["1621007947382-bb3c3994e3fb", "1609521263047-f8f205293f24", "1590362891991-f776e747a588"], createdDaysAgo: 5 },
  { brand: "Jeep", model: "Compass", version: "Limited 1.3 T270 Turbo Flex", year: [2023, 2024], condition: "USED", mileage: 28700, price: 164900, promo: 154900, fuel: "FLEX", transmission: "AUTOMATIC", engine: "1.3 Turbo", power: "185 cv", color: "Cinza Granite", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "10,8 km/l (cidade)", status: "AVAILABLE", offer: "Oferta da semana", images: ["1533473359331-0135ef1b58bf", "1519641471654-76ce0107ad1b", "1606016159991-dfe4f2746ad5"], createdDaysAgo: 34 },
  { brand: "Honda", model: "Civic", version: "Touring 1.5 Turbo CVT", year: [2021, 2021], condition: "USED", mileage: 41200, price: 149900, fuel: "GASOLINE", transmission: "CVT", engine: "1.5 Turbo", power: "173 cv", color: "Azul Cósmico", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "11,9 km/l (cidade)", status: "AVAILABLE", featured: true, images: ["1606611013016-969c19ba27bb", "1617469767053-d3b523a0b982", "1600712242805-5f78671b24da"], createdDaysAgo: 48 },
  { brand: "Volkswagen", model: "Nivus", version: "Highline 200 TSI", year: [2024, 2025], condition: "USED", mileage: 9800, price: 139900, promo: 132900, fuel: "FLEX", transmission: "AUTOMATIC", engine: "1.0 TSI", power: "128 cv", color: "Vermelho Sunset", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "12,3 km/l (cidade)", status: "AVAILABLE", offer: "Taxa zero", images: ["1549399542-7e3f8b79c341", "1502877338535-766e1452684a", "1511919884226-fd3cad34687c"], createdDaysAgo: 9 },
  { brand: "Mercedes-Benz", model: "C 300", version: "AMG Line 2.0 Turbo", year: [2022, 2022], condition: "USED", mileage: 32500, price: 329900, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "2.0 Turbo + EQ Boost", power: "258 cv", color: "Prata Íridio", doors: 4, seats: 5, drivetrain: "Traseira", consumption: "10,1 km/l (cidade)", status: "AVAILABLE", featured: true, images: ["1618843479313-40f8afb4b4d8", "1563720223185-11003d516935", "1525609004556-c46c7d6cf023"], createdDaysAgo: 27 },
  { brand: "Toyota", model: "Hilux", version: "SRX Plus 2.8 Diesel 4x4", year: [2024, 2024], condition: "USED", mileage: 22100, price: 319900, fuel: "DIESEL", transmission: "AUTOMATIC", engine: "2.8 Turbodiesel", power: "204 cv", color: "Preto Attitude", doors: 4, seats: 5, drivetrain: "4x4", consumption: "9,6 km/l (cidade)", status: "RESERVED", images: ["1544636331-e26879cd4d9b", "1571607388263-1044f9ea01dd", "1612825173281-9a193378527e"], createdDaysAgo: 60 },
  { brand: "Chevrolet", model: "Tracker", version: "Premier 1.2 Turbo", year: [2023, 2023], condition: "USED", mileage: 35800, price: 124900, fuel: "FLEX", transmission: "AUTOMATIC", engine: "1.2 Turbo", power: "133 cv", color: "Branco Summit", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "11,5 km/l (cidade)", status: "AVAILABLE", images: ["1616788494707-ec28f08d05a1", "1568605117036-5fe5e7bab0b7", "1541899481282-d53bffe3c35d"], createdDaysAgo: 75 },
  { brand: "Ford", model: "Mustang", version: "Mach 1 5.0 V8", year: [2022, 2022], condition: "USED", mileage: 6200, price: 489900, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "5.0 V8", power: "483 cv", color: "Azul Velocity", doors: 2, seats: 4, drivetrain: "Traseira", consumption: "6,2 km/l (cidade)", status: "AVAILABLE", featured: true, images: ["1494976388531-d1058494cdd8", "1552519507-da3b142c6e3d", "1583121274602-3e2820c69888"], createdDaysAgo: 16 },
  { brand: "Hyundai", model: "Creta", version: "Ultimate 2.0", year: [2024, 2025], condition: "NEW", mileage: 0, price: 179990, promo: 172990, fuel: "FLEX", transmission: "AUTOMATIC", engine: "2.0", power: "167 cv", color: "Cinza Titanium", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "10,4 km/l (cidade)", status: "AVAILABLE", offer: "Bônus na troca", images: ["1560958089-b8a1929cea89", "1494905998402-395d579af36f", "1485291571150-772bcfc10da5"], createdDaysAgo: 3 },
  { brand: "Audi", model: "Q5", version: "Prestige Plus 2.0 TFSI Quattro", year: [2021, 2022], condition: "USED", mileage: 39800, price: 289900, fuel: "GASOLINE", transmission: "DCT", engine: "2.0 TFSI", power: "249 cv", color: "Branco Glaciar", doors: 4, seats: 5, drivetrain: "Integral Quattro", consumption: "9,4 km/l (cidade)", status: "AVAILABLE", images: ["1517524008697-84bbe3c3fd98", "1489824904134-891ab64532f1", "1592198084033-aade902d1aae"], createdDaysAgo: 41 },
  // Histórico de vendas (não aparecem na loja)
  { brand: "Volkswagen", model: "T-Cross", version: "Comfortline 200 TSI", year: [2022, 2022], condition: "USED", mileage: 38000, price: 112900, fuel: "FLEX", transmission: "AUTOMATIC", engine: "1.0 TSI", power: "128 cv", color: "Prata Pyrit", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "11,8 km/l", status: "SOLD", published: false, images: ["1549399542-7e3f8b79c341"], createdDaysAgo: 150, soldDaysAgo: 120 },
  { brand: "Fiat", model: "Toro", version: "Volcano 2.0 Diesel 4x4", year: [2023, 2023], condition: "USED", mileage: 45000, price: 169900, fuel: "DIESEL", transmission: "AUTOMATIC", engine: "2.0 Turbodiesel", power: "170 cv", color: "Cinza Silverstone", doors: 4, seats: 5, drivetrain: "4x4", consumption: "10,2 km/l", status: "SOLD", published: false, images: ["1544636331-e26879cd4d9b"], createdDaysAgo: 130, soldDaysAgo: 95 },
  { brand: "Honda", model: "HR-V", version: "EXL 1.5 Turbo", year: [2023, 2024], condition: "USED", mileage: 18000, price: 154900, fuel: "FLEX", transmission: "CVT", engine: "1.5 Turbo", power: "177 cv", color: "Branco Pérola", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "11,1 km/l", status: "SOLD", published: false, images: ["1609521263047-f8f205293f24"], createdDaysAgo: 100, soldDaysAgo: 64 },
  { brand: "Jeep", model: "Renegade", version: "Longitude 1.3 T270", year: [2022, 2023], condition: "USED", mileage: 31000, price: 109900, fuel: "FLEX", transmission: "AUTOMATIC", engine: "1.3 Turbo", power: "185 cv", color: "Verde Recon", doors: 4, seats: 5, drivetrain: "Dianteira", consumption: "10,9 km/l", status: "SOLD", published: false, images: ["1519641471654-76ce0107ad1b"], createdDaysAgo: 80, soldDaysAgo: 33 },
  { brand: "BMW", model: "320i", version: "M Sport 2.0 Turbo", year: [2022, 2023], condition: "USED", mileage: 27000, price: 259900, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "2.0 Turbo", power: "184 cv", color: "Azul Portimão", doors: 4, seats: 5, drivetrain: "Traseira", consumption: "10,6 km/l", status: "SOLD", published: false, images: ["1555215695-3004980ad54e"], createdDaysAgo: 55, soldDaysAgo: 11 },
];

async function main() {
  console.log("→ Configurações do site");
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Matheus Automóveis",
      tagline: "Veículos selecionados, procedência garantida.",
      whatsapp: "5547999990000",
      phone: "(47) 3333-0000",
      email: "contato@matheusautomoveis.com.br",
      address: "Av. Brasil, 1500 — Centro",
      city: "Balneário Camboriú — SC",
      mapsUrl: "https://maps.google.com/?q=Av.+Brasil+1500+Balneario+Camboriu",
      businessHours: "Seg. a sex. 8h30–18h30 · Sáb. 9h–14h",
      instagram: "https://instagram.com/matheusautomoveis",
      facebook: "https://facebook.com/matheusautomoveis",
      youtube: "https://youtube.com/@matheusautomoveis",
      cnpj: "00.000.000/0001-00",
      heroTitle: "O carro certo, com a confiança que você merece.",
      heroSubtitle: "Novos e seminovos selecionados, revisados e com procedência garantida. Financiamento facilitado e avaliação justa do seu usado.",
      heroImageUrl: img("1503376780353-7e6692767b70"),
      aboutTitle: "Mais de 15 anos realizando sonhos sobre rodas",
      aboutText:
        "A Matheus Automóveis nasceu da paixão por carros e do compromisso com a transparência. Cada veículo do nosso estoque passa por uma rigorosa curadoria: vistoria cautelar, checagem de procedência e inspeção mecânica completa.\n\nNosso atendimento é consultivo — entendemos o que você precisa e cuidamos de todo o processo, da avaliação do seu usado à documentação final.",
      aboutImageUrl: img("1552519507-da3b142c6e3d"),
      featuredTitle: "Destaques do estoque",
      latestTitle: "Acabaram de chegar",
      offersTitle: "Oportunidades especiais",
      offersSubtitle: "Condições exclusivas por tempo limitado.",
      whatsappMessage: "Olá! Vim pelo site da Matheus Automóveis e gostaria de mais informações.",
      differentials: [
        { title: "Procedência garantida", description: "Vistoria cautelar e checagem documental completa em todos os veículos.", icon: "ShieldCheck" },
        { title: "Revisados e com garantia", description: "Inspeção mecânica de 120 itens e garantia de motor e câmbio.", icon: "Wrench" },
        { title: "Financiamento facilitado", description: "Parceria com os principais bancos e aprovação em minutos.", icon: "Landmark" },
        { title: "Avaliação justa na troca", description: "Seu usado avaliado pela tabela de mercado, com pagamento imediato.", icon: "Repeat" },
      ],
    },
  });

  console.log("→ Usuários");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@matheusautomoveis.com.br").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Matheus Andrade", email: adminEmail, role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 12), phone: "47999990000" },
  });
  const manager = await prisma.user.upsert({
    where: { email: "gerente@matheusautomoveis.com.br" },
    update: {},
    create: { name: "Carla Mendes", email: "gerente@matheusautomoveis.com.br", role: "MANAGER", passwordHash: await bcrypt.hash("Gerente@123", 12), phone: "47999991111" },
  });
  const seller1 = await prisma.user.upsert({
    where: { email: "rafael@matheusautomoveis.com.br" },
    update: {},
    create: { name: "Rafael Souza", email: "rafael@matheusautomoveis.com.br", role: "SELLER", passwordHash: await bcrypt.hash("Vendedor@123", 12), phone: "47999992222" },
  });
  const seller2 = await prisma.user.upsert({
    where: { email: "juliana@matheusautomoveis.com.br" },
    update: {},
    create: { name: "Juliana Costa", email: "juliana@matheusautomoveis.com.br", role: "SELLER", passwordHash: await bcrypt.hash("Vendedor@123", 12), phone: "47999993333" },
  });
  const sellers = [seller1, seller2, manager];

  console.log("→ Categorias, marcas e modelos");
  const categories = new Map<string, string>();
  for (const name of CATEGORIES) {
    const c = await prisma.category.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
    categories.set(name, c.id);
  }
  const models = new Map<string, { id: string; brandId: string; categoryId: string | null }>();
  for (const [brandName, list] of Object.entries(BRANDS)) {
    const brand = await prisma.brand.upsert({ where: { slug: slugify(brandName) }, update: {}, create: { name: brandName, slug: slugify(brandName) } });
    for (const [modelName, cat] of list) {
      const m = await prisma.vehicleModel.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: slugify(modelName) } },
        update: {},
        create: { name: modelName, slug: slugify(modelName), brandId: brand.id, categoryId: categories.get(cat) ?? null },
      });
      models.set(`${brandName}/${modelName}`, { id: m.id, brandId: brand.id, categoryId: m.categoryId });
    }
  }

  if ((await prisma.vehicle.count()) === 0) {
    console.log("→ Veículos de exemplo");
    let seq = 1;
    const created: { id: string; label: string; status: VehicleStatus; soldDaysAgo?: number; price: number }[] = [];
    for (const v of VEHICLES) {
      const m = models.get(`${v.brand}/${v.model}`)!;
      const code = `MA-${String(seq++).padStart(4, "0")}`;
      const label = `${v.brand} ${v.model} ${v.version}`;
      const slug = `${slugify(`${v.brand} ${v.model} ${v.version} ${v.year[1]}`)}-${code.toLowerCase()}`;
      const createdAt = daysAgo(v.createdDaysAgo);
      const published = v.published ?? true;
      const premium = v.price > 250000;
      const seller = sellers[seq % sellers.length];
      const vehicle = await prisma.vehicle.create({
        data: {
          slug,
          internalCode: code,
          brandId: m.brandId,
          modelId: m.id,
          categoryId: m.categoryId,
          version: v.version,
          manufactureYear: v.year[0],
          modelYear: v.year[1],
          condition: v.condition,
          mileage: v.mileage,
          plate: v.condition === "USED" ? `${["QJK", "RFT", "MLB", "QXZ"][seq % 4]}${seq}A${String(10 + seq).slice(-2)}` : null,
          price: v.price,
          promoPrice: v.promo ?? null,
          acceptsTrade: true,
          financingAvailable: true,
          status: v.status,
          engine: v.engine,
          power: v.power,
          fuel: v.fuel,
          transmission: v.transmission,
          steering: "Elétrica",
          drivetrain: v.drivetrain,
          doors: v.doors,
          seats: v.seats,
          color: v.color,
          consumption: v.consumption,
          features: premium ? [...COMMON_FEATURES, ...PREMIUM_FEATURES] : COMMON_FEATURES.slice(0, 9),
          description: `${label} ${v.year[0]}/${v.year[1]} em estado impecável. ${
            v.condition === "NEW"
              ? "Zero quilômetro, com garantia de fábrica e emplacamento facilitado."
              : "Único dono, todas as revisões realizadas na concessionária, manual e chave reserva."
          } Veículo vistoriado, com laudo cautelar aprovado e pronto para transferência.`,
          internalNotes: "Revisão de entrega realizada. Pneus dianteiros com 70%.",
          highlights: v.condition === "NEW" ? ["Zero km", "Garantia de fábrica", "IPVA pago"] : ["Único dono", "Revisões em concessionária", "Laudo cautelar aprovado"],
          conservation: v.condition === "NEW" ? "Veículo novo, sem uso." : "Pintura original, interior sem marcas de uso, mecânica revisada e sem pendências.",
          published,
          publishedAt: published ? createdAt : null,
          featured: v.featured ?? false,
          isOffer: Boolean(v.offer),
          offerLabel: v.offer ?? null,
          displayOrder: v.featured ? 1 : 10,
          views: Math.floor(Math.random() * 400) + 20,
          createdAt,
          createdById: admin.id,
          soldAt: v.soldDaysAgo ? daysAgo(v.soldDaysAgo) : null,
          soldPrice: v.soldDaysAgo ? Math.round(v.price * 0.97) : null,
          soldById: v.soldDaysAgo ? seller.id : null,
          images: { create: v.images.map((id, i) => ({ url: img(id), storageKey: null, order: i })) },
        },
      });
      await prisma.vehicleMovement.create({
        data: { vehicleId: vehicle.id, type: "CREATED", toStatus: "AVAILABLE", userId: admin.id, createdAt },
      });
      if (published) {
        await prisma.vehicleMovement.create({ data: { vehicleId: vehicle.id, type: "PUBLISHED", userId: manager.id, createdAt } });
      }
      if (v.status === "RESERVED") {
        await prisma.vehicleMovement.create({
          data: { vehicleId: vehicle.id, type: "STATUS_CHANGED", fromStatus: "AVAILABLE", toStatus: "RESERVED", note: "Sinal recebido", userId: seller1.id, createdAt: daysAgo(2) },
        });
      }
      if (v.soldDaysAgo) {
        await prisma.vehicleMovement.create({
          data: { vehicleId: vehicle.id, type: "SOLD", fromStatus: "AVAILABLE", toStatus: "SOLD", note: "Venda concluída", userId: seller.id, createdAt: daysAgo(v.soldDaysAgo) },
        });
      }
      created.push({ id: vehicle.id, label: `${label} ${v.year[0]}/${v.year[1]}`, status: v.status, soldDaysAgo: v.soldDaysAgo, price: v.price });
    }

    console.log("→ Orçamentos de exemplo");
    const people = [
      ["Fernanda Lima", "47991234567", "fernanda.lima@email.com"],
      ["Ricardo Alves", "47998765432", "ricardo.alves@email.com"],
      ["Patrícia Gomes", "48996543210", "patricia.gomes@email.com"],
      ["Bruno Carvalho", "47993456789", "bruno.c@email.com"],
      ["Aline Martins", "47992345678", "aline.martins@email.com"],
      ["Gustavo Pereira", "41998877665", "gustavo.pereira@email.com"],
      ["Larissa Rocha", "47995566778", "larissa.rocha@email.com"],
      ["Thiago Nunes", "47997788990", "thiago.nunes@email.com"],
      ["Camila Ribeiro", "48991122334", "camila.ribeiro@email.com"],
      ["Eduardo Santos", "47994455667", "eduardo.santos@email.com"],
    ] as const;
    const plan: { status: QuoteStatus; days: number; vehicleIdx: number; converted?: boolean }[] = [
      { status: "NEW", days: 0, vehicleIdx: 0 },
      { status: "NEW", days: 1, vehicleIdx: 3 },
      { status: "NEW", days: 1, vehicleIdx: 5 },
      { status: "IN_PROGRESS", days: 3, vehicleIdx: 1 },
      { status: "AWAITING_RETURN", days: 6, vehicleIdx: 4 },
      { status: "PROPOSAL_SENT", days: 9, vehicleIdx: 6 },
      { status: "NEGOTIATION", days: 4, vehicleIdx: 7 },
      { status: "FINISHED", days: 36, vehicleIdx: 15, converted: true },
      { status: "FINISHED", days: 14, vehicleIdx: 16, converted: true },
      { status: "CANCELED", days: 25, vehicleIdx: 9 },
    ];
    let protocol = 1000;
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      const [name, phone, email] = people[i];
      const vehicle = created[p.vehicleIdx];
      const assignee = p.status === "NEW" ? null : sellers[i % sellers.length];
      const createdAt = daysAgo(p.days);
      const hasTradeIn = i % 3 === 0;
      const quote = await prisma.quote.create({
        data: {
          protocol: `ORC-${++protocol}`,
          name,
          phone,
          email,
          vehicleId: vehicle.id,
          vehicleLabel: vehicle.label,
          message: "Olá! Tenho interesse neste veículo. Gostaria de saber as condições de pagamento.",
          wantsFinancing: i % 2 === 0,
          hasTradeIn,
          tradeInBrand: hasTradeIn ? "Volkswagen" : null,
          tradeInModel: hasTradeIn ? "Gol 1.6" : null,
          tradeInYear: hasTradeIn ? 2018 : null,
          tradeInMileage: hasTradeIn ? 78000 : null,
          source: i % 4 === 0 ? "INTEREST" : "FORM",
          status: p.status,
          convertedToSale: p.converted ?? false,
          assignedToId: assignee?.id ?? null,
          consentAt: createdAt,
          closedAt: p.status === "FINISHED" || p.status === "CANCELED" ? daysAgo(Math.max(p.days - 3, 0)) : null,
          createdAt,
        },
      });
      await prisma.quoteEvent.create({ data: { quoteId: quote.id, type: "CREATED", toStatus: "NEW", note: "Solicitação recebida pelo site", createdAt } });
      if (assignee) {
        await prisma.quoteEvent.createMany({
          data: [
            { quoteId: quote.id, type: "ASSIGNED", note: `Atribuído a ${assignee.name}`, userId: manager.id, createdAt: new Date(createdAt.getTime() + 3600_000) },
            { quoteId: quote.id, type: "STATUS_CHANGED", fromStatus: "NEW", toStatus: p.status, userId: assignee.id, note: "Primeiro contato realizado por telefone.", createdAt: new Date(createdAt.getTime() + 7200_000) },
          ],
        });
      }
    }
  }

  console.log("→ Depoimentos e banners");
  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({
      data: [
        { name: "Mariana Oliveira", city: "Itajaí — SC", vehicle: "Jeep Compass", text: "Atendimento impecável do início ao fim. Avaliaram meu carro de forma justa e saí com o Compass no mesmo dia. Recomendo de olhos fechados.", rating: 5, order: 1 },
        { name: "Carlos Eduardo", city: "Balneário Camboriú — SC", vehicle: "BMW 320i", text: "Transparência total: me mostraram o laudo cautelar e todo o histórico de revisões. Comprar um seminovo nunca foi tão tranquilo.", rating: 5, order: 2 },
        { name: "Juliana Ferreira", city: "Blumenau — SC", vehicle: "Toyota Corolla Cross", text: "O financiamento foi aprovado rapidinho e a equipe cuidou de toda a documentação. Experiência de concessionária premium.", rating: 5, order: 3 },
      ],
    });
  }
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        { title: "Semana do SUV", subtitle: "Taxas a partir de 0,99% a.m. e bônus na troca do seu usado.", imageUrl: img("1533473359331-0135ef1b58bf"), ctaLabel: "Ver SUVs", ctaHref: "/veiculos?categoria=suv", order: 1 },
        { title: "Esportivos selecionados", subtitle: "Performance e exclusividade com procedência garantida.", imageUrl: img("1494976388531-d1058494cdd8"), ctaLabel: "Conhecer", ctaHref: "/veiculos?categoria=esportivo", order: 2 },
      ],
    });
  }

  console.log("\n✔ Seed concluído");
  console.log(`  Admin:    ${adminEmail} / ${adminPassword}`);
  console.log("  Gerente:  gerente@matheusautomoveis.com.br / Gerente@123");
  console.log("  Vendedor: rafael@matheusautomoveis.com.br / Vendedor@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
