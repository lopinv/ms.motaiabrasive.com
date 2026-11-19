export const SITE = {
  name: 'MoTai Abrasives',
  nameAr: 'MoTai bahan penggera',
  legalName: 'Hubei MoTai Abrasives Materials Co., Ltd.',
  url: 'https://ms.motaiabrasive.com',
  locale: 'ms',
  email: 'motai-01@motaiabrasive.com',
  whatsapp: '8618118635597',
  phone: '+86 181 1863 5597',
  address: 'No. 88 Yuli Avenue, Junshui Town, Tongcheng County, Xianning, Hubei, China',
  addressAr: 'No. 88 Aliran Yuli, Bandar Junshui, Daerah Tongcheng, Xianning, Hubei, China',
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61595012045510',
    instagram: 'https://www.instagram.com/motai_1_',
  },
} as const;

export const navItems = [
  { label: 'Laman Utama', href: '/' },
  { label: 'Produk', href: '/products' },
  { label: 'Industri', href: '/industries' },
  { label: 'Kenapa MoTai', href: '/company' },
  { label: 'Jaminan Kualiti', href: '/quality' },
  { label: 'Artikel', href: '/articles' },
  { label: 'Sumber', href: '/resources' },
  { label: 'Hubungi Kami', href: '/contact' },
];

export const productCategories = [
  {
    slug: 'abrasive-belts',
    name: 'Tali Penggera',
    title: 'Tali penggera industri untuk penghabisan permukaan yang seragam',
    description:
      'Tali penggera direka untuk membersihkan runcing dan penghabisan berulang dalam aplikasi kayu dan logam. Kami menyelaraskan spesifikasi bersama pembeli supaya sepadan dengan jenis mesin, bahan yang dibuat, jenis sambungan dan kuantiti yang diminta sebelum pengeluaran dimulakan.',
    image: '/images/belt-533.webp',
    applications: ['Penggergantungan Kayu', 'Penghabisan Logam', 'Pengeluaran Perabot Dalaman'],
    specs: [
      ['Sasaran Penggunaan', 'Penghabisan runcing dan penyingkisan lapisan permukaan'],
      ['Jenis Asas', 'Kertas, fabrik atau serabut polimer'],
      ['Saiz Tersedia', '533×75 mm, 610×100 mm, 1520×630 mm, 2200×1330 mm'],
      ['Standard Kesesuaian', 'Semak jenis mesin dan jenis sambungan bersama pembeli'],
      ['Pilihan Tersuai', 'Gredan, saiz, jenama dan pembungkusan'],
    ],
    faq: [
      {
        q: 'Bolehkah saiz tali dipersonalkan?',
        a: 'Boleh. Kami menentukan saiz dan jenis asas bersama jenis sambungan yang sepadan dengan mesin pelanggan, dan mengesahkan arah putaran tali sebelum kelulusan pesanan pengeluaran.',
      },
      {
        q: 'Bagaimana memilih gredan yang sesuai?',
        a: 'Pilih gredan kasar untuk penggera pantas, gredan sederhana untuk penghabisan seragam, dan gredan halus untuk pembikinan akhir. Operator boleh menghantar sampel dan keadaan permukaan untuk nasihat yang lebih tepat.',
      },
      {
        q: 'Bolehkah produk jenama OEM dipesan?',
        a: 'Boleh. Persyaratan jenama, pembungkusan dan logo pelanggan boleh dinilai pada peringkat pengesahan spesifikasi, dan kesannya ke atas minimum pesanan dan kos akan ditentukan.',
      },
    ],
  },
  {
    slug: 'flap-discs',
    name: 'Cakera Flap',
    title: 'Cakera Flap untuk pembersihan dan penghabisan logam yang berkesan',
    description:
      'Cakera flap dua hala berbeza menggabungkan penggera dan penghabisan yang seimbang. Sesuai untuk penyelenggaraan peralatan, penggilangan karat dan persediaan runcing sebelum pelaburan atau pemasangan; pemilihan gredan dan asas, jenis bahan dan kuasa pembikinan turut dipertimbangkan.',
    image: '/images/flap-disc.jpg',
    applications: ['Penyelenggaraan Peralatan', 'Penggilangan Karat', 'Persediaan Permukaan Sebelum Pelaburan'],
    specs: [
      ['Diameter Tersedia', '115 mm, 125 mm, 180 mm dan 180/230 mm'],
      ['Jenis Gredan', 'Aluminium oksida, seramik atau campuran mengikut aplikasi'],
      ['Jenis Asas', 'Plastik atau serabut kaca'],
      ['Pilihan Bekalan', 'Pembungkusan unit tunggal dan kuantiti komersial'],
      ['Pilihan Tersuai', 'Gred gredan, warna dan jenama'],
    ],
    faq: [
      {
        q: 'Apakah perbezaan asas plastik dan asas serabut kaca?',
        a: 'Asas serabut kaca lebih sesuai untuk pembikinan berat dan diuji daya tarikan, manakala asas plastik sesuai untuk kerja am. Pilihan hendaklah dibuat mengikut jenis mesin dan sifat aplikasi.',
      },
      {
        q: 'Cakera ini sesuai untuk penggera lapisan tebal ke?',
        a: 'Cakera boleh digunakan untuk lapisan nipis dan sederhana. Untuk penggera kuat, cadangan menggunakan cakera yang sepadan dengan bahan, bersama kuasa pembikinan dan halaju makan terkawal.',
      },
    ],
  },
  {
    slug: 'sanding-discs',
    name: 'Cakera Penggera',
    title: 'Cakera jaring untuk penghabisan yang seragam',
    description:
      'Cakera jaring sesuai untuk penghabisan, penyalakan halus dan persediaan permukaan. Struktur jaring terbuka membolehkan debu keluar semasa penggeraan dan mengekalkan hasil yang konsisten; sistem pelekatan dipilih mengikut mesin pembeli.',
    image: '/images/mesh-disc.webp',
    applications: ['Penghabisan Kayu', 'Logam Tepat', 'Hiasan Dan Persediaan'],
    specs: [
      ['Diameter Tersedia', '5 inci, 6 inci'],
      ['Jenis', 'Jaring lubang terbuka'],
      ['Gredan', 'Bergredan untuk pelbagai tujuan'],
      ['Kesesuaian', 'Mengikut sistem pelekatan mesin penggera'],
      ['Pembungkusan', 'Set mengikut keperluan operator'],
    ],
    faq: [
      {
        q: 'Apakah cakera jaring?',
        a: 'Cakera yang menggunakan jaring terbuka untuk membolehkan debu keluar semasa penggeraan, satu pilihan praktikal untuk proses yang memerlukan permukaan seragam dan kurang debu melekat.',
      },
      {
        q: 'Boleh bekalkan cakera dalam saiz berbeza?',
        a: 'Semua saiz yang tersedia boleh dibekalkan; saiz khas disahkan dalam spesifikasi pesanan dan rancangan pengeluaran.',
      },
    ],
  },
  {
    slug: 'hook-loop',
    name: 'Cakera Hook & Loop',
    title: 'Cakera Hook & Loop boleh pasang dan guna semula',
    description:
      'Cakera penggera sistem Hook & Loop (Velcro) diameter 3, 4, 5, 6 inci, boleh digunakan dengan tapak pelekat piawai. Gredan daripada 60 hingga 5000, sesuai untuk permukaan rata dan penghabisan berulang tanpa skru.',
    image: '/images/disc-hook-loop.webp',
    applications: ['Penghabisan Permukaan Rata', 'Penyelenggaraan Berulang', 'Persediaan Sebelum Pelaburan'],
    specs: [
      ['Diameter Tersedia', '3 inci, 4 inci, 5 inci, 6 inci'],
      ['Sistem Pelekatan', 'Hook & Loop (Velcro) boleh tanggal'],
      ['Gredan', '60 hingga 5000 dalam pelbagai diameter'],
      ['Kesesuaian', 'Tapak Velcro piawai'],
      ['Pembungkusan', 'Set campuran mengikut keperluan operator'],
    ],
    faq: [
      {
        q: 'Apakah perbezaan Hook & Loop dengan cakera pelekat PSA?',
        a: 'Sistem Velcro membolehkan cakera tanggal dan digunakan semula pada tapak pelbagai kali, manakala cakera PSA hanya sekali guna. Velcro disarankan jika anda kerap menukar gred gredan.',
      },
      {
        q: 'Boleh bekalkan keempat-empat diameter dalam satu penghantaran?',
        a: 'Boleh. Set campuran boleh dibungkus mengikut senarai operator, dengan bilangan gredan ditentukan untuk setiap diameter.',
      },
    ],
  },
  {
    slug: 'sanding-sponges',
    name: 'Spons Penggera',
    title: 'Spons penggera untuk penyalakan runcing dan pembikinan akhir',
    description:
      'Spons penggera fleksibel untuk runcing, permukaan melengkung dan kerja tangan. Sesuai untuk fasa penghabisan akhir dengan kadar pembikinan yang praktikal dan selesa, tersedia dalam pelbagai bentuk dan gredan untuk pelbagai fasa penggeraan dan penyalakan.',
    image: '/images/sponge.jpg',
    applications: ['Penghabisan Akhir', 'Penyalakan Runcing', 'Pemulihan Permukaan'],
    specs: [
      ['Sasaran Penggunaan', 'Tangan atau sesuai dengan alat pepegit'],
      ['Gred Gredan', '36, 60, 80, 100, 120, 180, 220, 240, 280'],
      ['Cakera Hook & Loop', '180, 320, 400, 500–600, 800–1000, 1200–1500, 2000, 2500, 3000'],
      ['Bentuk', 'Plat, blok dan spons mengikut aplikasi'],
      ['Pembungkusan', 'Unit tunggal atau paket komersial'],
    ],
    faq: [
      {
        q: 'Apakah perbezaan spons gredan dan keping Hook & Loop?',
        a: 'Spons gredan untuk penghabisan tangan yang fleksibel, manakala keping Hook & Loop sesuai untuk permukaan rata dan boleh dilekat pada tapak pelekat.',
      },
      {
        q: 'Spons sesuai untuk sudut sempit ke?',
        a: 'Ya. Fleksibiliti spons membolehkan penggeraan terkawal pada runcing dan permukaan melengkung, dengan tekanan selesa semasa kerja.',
      },
    ],
  },
] as const;

export const industries = [
  {
    slug: 'woodworking',
    name: 'Penggergantungan Kayu',
    title: 'Penyelesaian penggera untuk perabot dan kayu berproses',
    description:
      'Proses penghabisan kayu bergantung kepada keseimbangan antara penggeraan dan penyalakan. Pilihan tali dan cakera yang tepat menghasilkan proses yang lebih stabil dan kualiti boleh diulang, serta mengurangkan masa rehat akibat beban yang tidak sesuai.',
    image: '/images/belt-533.webp',
    challenges: [
      'Mempertingkatkan tahap penghabisan yang seragam antara bahagian berbeza',
      'Mengurangkan rehat mesin akibat muatan tali',
      'Memilih gredan yang sesuai untuk setiap fasa pembikinan',
    ],
    products: ['abrasive-belts', 'sanding-discs', 'sanding-sponges'],
    faq: [
      {
        q: 'Bagaimana mengekalkan kualiti kayu yang stabil?',
        a: 'Tentukan fasa penggera, kemudian tahap penghabisan, diikuti gredan pembikinan akhir. Ini membantu menyerasikan fasa pengeluaran dan mengurangkan kerja semula.',
      },
      {
        q: 'Bolehkah tali penggera disesuaikan dengan talian terdapatnya?',
        a: 'Hantar sampel jenis mesin dan jenis sambungan, kemudian semak saiz dan asas tali sebelum kelulusan bekalan.',
      },
    ],
  },
  {
    slug: 'metalworking',
    name: 'Penghabisan Logam',
    title: 'Penyelesaian penggera untuk logam dan penyelenggaraan industri',
    description:
      'Permukaan logam memerlukan penyingkisan oksida, penggilangan runcing, kemudian pelaburan. Cakera dan tali dipilih mengikut kekerasan logam, tahap permukaan dan sama ada permukaan menerima rawatan pelindung atau tidak.',
    image: '/images/workshop.jpg',
    challenges: [
      'Penggilangan karat tanpa merosakkan komponen',
      'Persediaan runcing sebelum pelaburan',
      'Pilihan bahan penggera yang sepadan dengan kekerasan',
    ],
    products: ['flap-discs', 'abrasive-belts'],
    faq: [
      {
        q: 'Adakah bahan penggera yang sesuai untuk kekerasan tinggi?',
        a: 'Tentukan jenis gredan mengikut jenis logam dan gred penggera yang diperlukan, kemudian hantar sampel atau cadangan gredan uji sebelum pesanan kuantiti.',
      },
      {
        q: 'Apakah yang perlu dinyatakan dalam permintaan sebut harga?',
        a: 'Jenis logam, gred penggera yang diperlukan, diameter alat, jenis pelekatan, kuantiti dan kekerapan pesanan.',
      },
    ],
  },
  {
    slug: 'automotive',
    name: 'Automotif Dan Penyelenggaraan',
    title: 'Bahan penggera untuk persediaan badan kereta dan penyelenggaraan',
    description:
      'Dari penyingkisan cat lama, persediaan panel badan, hingga penyalakan runcing — setiap fasa memerlukan alat dan bahan penggera yang berbeza. Kami menyediakan nasihat mengikut produk dan kaedah pembikinan.',
    image: '/images/flap-disc.jpg',
    challenges: [
      'Persediaan permukaan sebelum pelaburan',
      'Penggilangan runcing selepas pemotongan',
      'Pilihan cakera mengikut kekerasan lapisan cat',
    ],
    products: ['flap-discs', 'abrasive-belts'],
    faq: [
      {
        q: 'Bagaimana mempersediakan permukaan untuk pelaburan?',
        a: 'Proses merangkumi penyingkisan lapisan lama, pembersihan permukaan, penyalakan runcing dan pemeriksaan kecacatan. Jenis bahan menentukan fasa setiap langkah.',
      },
      {
        q: 'Boleh bekalkan pembungkusan khas untuk bengkel penyelenggaraan?',
        a: 'Boleh. Pembungkusan boleh dibuat mengikut kategori produk dan kadar kegunaan bengkel.',
      },
    ],
  },
  {
    slug: 'shipbuilding',
    name: 'Maritim Dan Penyelenggaraan Kapal',
    title: 'Bahan penggera untuk persediaan permukaan kapal dan penggilangan karat',
    image: '/images/flap-disc.jpg',
    description:
      'Proses persediaan permukaan di bengkel pembinaan kapal bermula dengan penggilangan karat dan penyingkisan cat lama pada plat keluli, diikuti rawatan jalur las, persediaan permukaan sebelum pelaburan dan pengurangan geseran permukaan. Pilihan tali/cakera bergantung pada luas permukaan, jenis karat dan halaju pembikinan.',
    challenges: [
      'Penggilangan karat plat keluli tanpa menggores asas',
      'Rawatan runcing dan jalur las sebelum pelaburan',
      'Persediaan permukaan sebelum lapisan anti-karat',
    ],
    products: ['flap-discs', 'abrasive-belts'],
    faq: [
      {
        q: 'Gredan mana yang sesuai untuk penggilangan karat di bengkel kapal?',
        a: 'Gred kasar 40–80 untuk menyingkiskan cat dan karat, diikuti 100–180 untuk meratakan. Kami memeriksa jenis karat dan kaedah pembikinan sebelum memberikan nasihat yang tepat.',
      },
      {
        q: 'Adakah pembungkusan besar untuk talian produksi maritim?',
        a: 'Ya. Bekalan kuantiti stabil secara berkala boleh disediakan mengikut kadar kegunaan sebenar bengkel kapal.',
      },
    ],
  },
  {
    slug: 'oil-gas',
    name: 'Minyak Gas - Persediaan Permukaan',
    title: 'Bahan penggera untuk persediaan paip dan tangki minyak gas',
    image: '/images/factory.jpg',
    description:
      'Persediaan permukaan dalam sektor minyak gas merangkumi penggilangan karat paip, rawatan permukaan dalaman tangki, penyelenggaraan platform laut dan persediaan sebelum pelaburan anti-kerosakan. Gredan dan jenis cakera ditentukan mengikut jenis permukaan dan persyaratan cat.',
    challenges: [
      'Penggilangan karat paip tanpa merosakkan permukaan',
      'Persediaan permukaan dalaman tangki sebelum pelaburan',
      'Pilihan gredan yang tahan persekitaran lembap dan korosif',
    ],
    products: ['flap-discs', 'sanding-discs'],
    faq: [
      {
        q: 'Bagaimana menentukan gredan untuk tangki minyak?',
        a: 'Mula dengan gred kasar 40–80 untuk penggeraan, kemudian naikkan ke penghabisan 120–180. Jenis gredan (oksida/zirkonia) bergantung pada kekerasan permukaan. Semak spesifikasi sebelum kelulusan.',
      },
      {
        q: 'Adakah sokongan sampel uji sebelum pesanan kuantiti?',
        a: 'Ya. Hantar sampel bersama bahan dan gredan, dan rekodkan hasil uji sebelum pengeluaran pukal.',
      },
    ],
  },
  {
    slug: 'construction',
    name: 'Pemprosesan Bahan Binaan',
    title: 'Bahan penggera untuk rawatan plat gipsum dan konkrit',
    image: '/images/converting.jpg',
    description:
      'Rawatan bahan binaan (plat gipsum, simen, batu, kayu) memerlukan alat penggera fleksibel yang sepadan dengan permukaan melengkung dan rata. Gredan dan asas dipilih mengikut fasa penghabisan dan jenis permukaan.',
    challenges: [
      'Permukaan gipsum yang seragam sebelum pelaburan',
      'Penyalakan runcing plat dan sendi',
      'Kawalan debu di tapak pembinaan',
    ],
    products: ['sanding-discs', 'sanding-sponges', 'abrasive-belts'],
    faq: [
      {
        q: 'Alatan apa yang sesuai untuk plat gipsum?',
        a: 'Cakera jaring untuk penyingkisan debu, atau spons penggera untuk runcing dan permukaan melengkung. Gredan 120–240 sesuai untuk pelaburan.',
      },
      {
        q: 'Adakah pembungkusan campuran untuk bengkel pembinaan?',
        a: 'Ya. Set campuran boleh dibungkus mengikut senarai operator, dengan bilangan gredan ditentukan untuk setiap alat.',
      },
    ],
  },
  {
    slug: 'general',
    name: 'Industri Am',
    title: 'Penyelesaian penggera untuk penyelenggaraan dan industri am',
    image: '/images/workshop.jpg',
    description:
      'Kerja penyelenggaraan, pembaikan dan pembersihan permukaan dalam fasiliti industri am. Merangkumi pelbagai bahan dan aplikasi, dengan pilihan tersuai yang sepadan dengan kadar kegunaan yang tepat.',
    challenges: [
      'Mempertingkatkan kualiti penghabisan yang seragam antara talian berbeza',
      'Pilihan gredan yang sesuai untuk aplikasi am',
      'Pengurangan kos setiap unit rawatan',
    ],
    products: ['abrasive-belts', 'flap-discs', 'sanding-discs'],
    faq: [
      {
        q: 'Bagaimana memilih bahan penggera untuk penyelenggaraan am?',
        a: 'Tentukan jenis permukaan, fasa pembikinan dan mesin yang sedia ada. Cadangan urutan 80–120–180 untuk kebanyakan aplikasi am.',
      },
      {
        q: 'Boleh bekalkan kuantiti kecil pelbagai jenis?',
        a: 'Ya. Pembungkusan set campuran saiz yang sesuai untuk bengkel dengan kegunaan pelbagai.',
      },
    ],
  },
] as const;

/**
 * Senario aplikasi — merangkumi keseluruhan proses penghabisan (10 senario)
 * Pautan hanya ke halaman produk sebenar dalam tapak web.
 */
export const applicationScenes = [
  { title: 'Penghabisan Logam Industri', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-metal-real-1600.jpg?width=900', href: '/products/flap-discs' },
  { title: 'Penggeraan Plat Kayu', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-wood-real-1600.jpg?width=900', href: '/products/sanding-discs' },
  { title: 'Persediaan Permukaan Automotif', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-auto-real-1600.jpg?width=900', href: '/products/sanding-discs' },
  { title: 'Penghabisan Bahagian Logam', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-stainless-real-1600.jpg?width=900', href: '/products' },
  { title: 'Penggilangan Karat Sektor Maritim', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-marine-real-1600.jpg?width=900', href: '/products/flap-discs' },
  { title: 'Pemotongan Logam Dan Penggilangan Runcing', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-surface-real-1600.jpg?width=900', href: '/products/abrasive-belts' },
  { title: 'Perabot Dan Bentuk Melengkung', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-furniture-real-1600.jpg?width=900', href: '/products/sanding-sponges' },
  { title: 'Penggeraan Dinding Dan Plat Gipsum', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-drywall-real-1600.jpg?width=900', href: '/products/sanding-discs' },
  { title: 'Perhiasan Dan Bahagian Tepat', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-precision-real-1600.jpg?width=900', href: '/products/models/psa-disc-3-inch' },
  { title: 'Penggeraan Tangan Dan Kriya', image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-application-hand-real-1600.jpg?width=900', href: '/products/sanding-sponges' },
] as const;

/**
 * Empat kumpulan pengguna — dipaparkan sebagai kad «kategori produk» di halaman utama,
 * setiap kad dengan pautan sebenar dalam tapak web.
 */
export const productCategoryLines = [
  {
    no: '01',
    name: 'Tali Penggera',
    slug: 'abrasive-belts',
    description:
      'Tali penggera merah saiz 533×75 hingga 2200×1330 mm, gredan 40 hingga 800, bersama sampel rujukan. Permintaan borong dan OEM dialu-alukan.',
    image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-gxk-51-model.jpg?width=640',
    href: '/products/abrasive-belts',
  },
  {
    no: '02',
    name: 'Cakera Flap',
    slug: 'flap-discs',
    description:
      'Cakera flap asas plastik, keluli atau serabut kaca. Hantar jenis stok, diameter, gredan dan kuantiti yang diminta, kami akan mengemukakan sebut harga yang sepadan.',
    image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-flap-plastic-reddish-brown-display.png?width=640',
    href: '/products/flap-discs',
  },
  {
    no: '03',
    name: 'Spons Penggera',
    slug: 'sanding-sponges',
    description:
      'Keping spons penggera fleksibel dan plat spons tebal, untuk permukaan melengkung, runcing, permukaan rata dan gipsum kering atau basah. Boleh digunakan semula setelah dibersihkan. Permintaan borong dan OEM dialu-alukan.',
    image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-flexible-sanding-sponge-pads-range.jpg?width=640',
    href: '/products/sanding-sponges',
  },
  {
    no: '04',
    name: 'Cakera Penggera',
    slug: 'sanding-discs',
    description:
      'Cakera penggera pelekat PSA sistem Hook & Loop, jaring dan keras, diameter 3 hingga 6 inci, gredan 60 hingga 5000. Permintaan borong dan OEM dialu-alukan.',
    image: 'https://www.motaiabrasive.com/cdn/shop/files/motai-new-disc-gold-8-20261029.jpg?width=640',
    href: '/products/sanding-discs',
  },
] as const;

export const companyFacts = [
  { value: '5', label: 'Kumpulan Produk Penggera' },
  { value: '5', label: 'Fasa Dari Spesifikasi Ke Penghantaran' },
  { value: '1', label: 'Kumpulan Sokongan Langsung Kepada Pembeli' },
  { value: 'OEM', label: 'Jenama Dan Pembungkusan Tersuai' },
];

export const qualitySteps = [
  {
    title: 'Pengesahan Spesifikasi',
    text: 'Mengesahkan bersama pembeli jenis produk, saiz, gredan, asas, kuantiti dan pembungkusan sebelum pengeluaran.',
  },
  {
    title: 'Sampel Dan Pemeriksaan',
    text: 'Sampel boleh dihantar untuk diuji banding sebelum kelulusan kuantiti akhir, dengan maklum balas pembeli direkodkan.',
  },
  {
    title: 'Pembikinan Dan Persediaan',
    text: 'Pembikinan mengikut spesifikasi yang disahkan, mengambil perhatian jenis mesin, jenis pelekatan dan saiz yang diminta.',
  },
  {
    title: 'Pemeriksaan Dan Pembungkusan',
    text: 'Memeriksa struktur, diameter, asas dan pembungkusan sebelum memuatkan lot; sampel rujukan disimpan mengikut keperluan.',
  },
  {
    title: 'Penghantaran Dan Dokumen',
    text: 'Menyelaraskan kaedah penghantaran dan menyediakan maklumat muatan mengikut permintaan pelanggan, dengan pemantauan maklum balas setelah dihantar.',
  },
];

export const resources = [
  {
    slug: 'abrasive-grit-guide',
    title: 'Panduan Pemilihan Gredan',
    description:
      'Jadual rujukan yang mengaitkan gredan dengan kerja penghabisan asas, membantu pasukan pembekalan menentukan spesifikasi yang lebih ringkas ketika berhubung dengan kami.',
    type: 'Panduan Teknikal',
    image: '/images/grit-reference.png',
    sections: [
      {
        title: 'Sebelum Meminta',
        items: [
          'Tentukan bahan dan mesin pembikinan',
          'Tentukan fasa: penggera, penghabisan atau pembikinan akhir',
          'Kumpulkan sampel jika ada untuk diuji banding',
        ],
      },
      {
        title: 'Maklumat Berguna',
        items: [
          'Saiz dan unit yang diminta',
          'Jenis mesin dan jenis pelekatan',
          'Kuantiti anggaran dan kekerapan pesanan',
        ],
      },
    ],
  },
  {
    slug: 'oem-packaging-guide',
    title: 'Panduan Persediaan Permintaan OEM',
    description:
      'Langkah-langkah penyediaan dokumen jenama dan pembungkusan, mempercepatkan kelulusan spesifikasi dan mengurangkan kesilapan percetakan pada bahan.',
    type: 'Panduan Bekalan',
    image: '/images/converting.jpg',
    sections: [
      {
        title: 'Fail Yang Perlu Disediakan',
        items: [
          'Fail logo dalam format vektor',
          'Reka bentuk pembungkusan dan bahasa yang diminta',
          'Pasaran sasaran dan maklumat pematuhan',
        ],
      },
      {
        title: 'Yang Kami Semak',
        items: [
          'Spesifikasi cetakan dan luas permukaan cetakan',
          'Zon percetakan dan bilangan produk dalam setiap kotak',
        ],
      },
    ],
  },
];
