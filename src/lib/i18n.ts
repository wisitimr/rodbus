export type Locale = "en" | "th";

const translations = {
  en: {
    // Landing
    heroDescription: "Tap the NFC sticker in your car to log your ride. Costs are split automatically.",
    nfcTapIn: "NFC Tap-In",
    autoSplit: "Auto Split",
    monthlyReports: "Monthly Reports",
    goToDashboard: "Go to Dashboard",
    signIn: "Sign In",
    signOut: "Sign Out",
    signInSubtitle: "Sign in to track your rides",
    signUpSubtitle: "Create an account to get started",

    // Dashboard
    dashboard: "Dashboard",
    welcome: "Welcome",
    admin: "Admin",
    configure: "Configure",
    yourPendingDebt: "Your Pending Debt",
    accrued: "Accrued",
    paid: "Paid",
    allClear: "All clear!",
    viewCostBreakdown: "View cost breakdown",
    riders: "riders",
    todaysRides: "Today's Rides",
    noRidesToday: "No rides logged today.",
    outbound: "Outbound",
    return: "Return",
    recentTrips: "Recent Trips",
    noTripHistory: "No trip history yet.",
    date: "Date",
    time: "Time",
    car: "Car",
    type: "Type",
    paymentHistory: "Payment History",
    noPayments: "No payments recorded yet.",
    note: "Note",
    from: "From",
    gas: "Gas",
    parking: "Parking",
    amount: "Amount",
    monthlySummary: "Monthly Summary",
    summary: "Summary",
    day: "Day",
    month: "Month",
    year: "Year",
    noCostsThisMonth: "No costs recorded this month.",
    noCostsToday: "No costs recorded today.",
    noCostsThisYear: "No costs recorded this year.",
    noData: "No data available.",
    passenger: "Passenger",
    pending: "Pending",
    you: "you",
    enterDailyCosts: "Enter Daily Costs",
    gasCost: "Gas (฿)",
    parkingCost: "Parking (฿)",
    saving: "Saving...",
    saved: "Saved!",
    saveCosts: "Save Costs",
    failedToSave: "Failed to save. Please try again.",
    confirmSaveCostsTitle: "Save these costs?",
    costReminderBanner: "You have missing cost entries — scroll down to enter.",
    missingDates: "Missing dates",
    defaultGasCost: "Default Gas Cost (฿)",
    editCosts: "Edit",
    costsSaved: "Costs saved",
    history: "History",
    recent: "Recent",
    trips: "Trips",
    payments: "Payments",
    viewAll: "View All",

    // Admin
    settings: "Settings",
    qrCode: "QR Code",
    userManagement: "User Management",
    pendingApproval: "Pending Approval",
    approve: "Approve",
    noPendingUsers: "No pending users.",
    activeUsers: "Active Users",
    noName: "No name",
    revoke: "Revoke",
    deleteUser: "Delete",
    confirmDeleteUser: "Delete this user? All their trips, payments, and owned cars will be permanently removed.",
    costManagement: "Cost Management",
    debtSettlement: "Debt Settlement",
    allBalancesCleared: "All balances are cleared.",
    clearFullBalance: "Clear Full Balance",
    customAmount: "Custom Amount (฿)",
    recordPayment: "Record Payment",
    operatingDays: "Operating Days",
    selectDate: "Select a date",
    reason: "Reason (optional)",
    disableDate: "Disable Date",
    disabledDatesUpcoming: "Disabled Dates (upcoming)",
    reEnable: "Re-enable",
    noDisabledDates: "No upcoming dates are disabled. The system is operating normally.",

    // Car Management
    carManagement: "Car Management",
    addCar: "Add Car",
    carName: "Car Name",
    licensePlate: "License Plate (optional)",
    owner: "Owner",
    selectOwner: "Select owner",
    adding: "Adding...",
    noCars: "No cars registered yet.",
    deleteCar: "Delete",
    confirmDeleteCar: "Delete this car? All trips and costs will be lost.",

    // QR
    qrCodeCheckin: "QR Code Check-in",
    qrDescription: "Show this QR code to passengers who cannot tap NFC",
    back: "Back",
    noCarsRegistered: "You have no cars registered.",
    selectCar: "Select Car",
    qrScanInstructions: "Passengers scan this code with their phone camera to check in. It works exactly like the NFC sticker.",
    viewTapUrl: "View tap URL",

    // Tap Success
    rideLogged: "Ride Logged!",
    rideRecorded: "ride has been recorded.",
    alreadyRecorded: "Already Recorded",
    alreadyRecordedDesc: "was already logged. No duplicate created.",
    tooSoon: "Too Soon for Evening",
    tooSoonDesc: "Not enough time has passed since your morning tap. Try again later.",
    systemDisabled: "System Disabled",
    systemDisabledDesc: "The carpool system is disabled for today.",
    tapReceived: "Tap Received",
    tapProcessed: "Your tap has been processed.",

    // Pending Approval
    pendingApprovalTitle: "Pending Approval",
    pendingApprovalDesc: "Your account is awaiting approval from an administrator. You will be able to use the carpool system once approved.",
    signedInAs: "Signed in as",
  },
  th: {
    // Landing
    heroDescription: "แตะสติ๊กเกอร์ NFC ในรถเพื่อบันทึกการเดินทาง ค่าใช้จ่ายจะถูกหารอัตโนมัติ",
    nfcTapIn: "แตะ NFC",
    autoSplit: "หารค่าใช้จ่าย",
    monthlyReports: "รายงานรายเดือน",
    goToDashboard: "ไปที่แดชบอร์ด",
    signIn: "เข้าสู่ระบบ",
    signOut: "ออกจากระบบ",
    signInSubtitle: "เข้าสู่ระบบเพื่อติดตามการเดินทาง",
    signUpSubtitle: "สร้างบัญชีเพื่อเริ่มใช้งาน",

    // Dashboard
    dashboard: "แดชบอร์ด",
    welcome: "สวัสดี",
    admin: "แอดมิน",
    configure: "ตั้งค่า",
    yourPendingDebt: "ยอดค้างจ่าย",
    accrued: "สะสม",
    paid: "จ่ายแล้ว",
    allClear: "ไม่มียอดค้าง!",
    viewCostBreakdown: "ดูรายละเอียดค่าใช้จ่าย",
    riders: "คน",
    todaysRides: "การเดินทางวันนี้",
    noRidesToday: "ยังไม่มีการเดินทางวันนี้",
    outbound: "ขาไป",
    return: "ขากลับ",
    recentTrips: "การเดินทางล่าสุด",
    noTripHistory: "ยังไม่มีประวัติการเดินทาง",
    date: "วันที่",
    time: "เวลา",
    car: "รถ",
    type: "ประเภท",
    paymentHistory: "ประวัติการชำระเงิน",
    noPayments: "ยังไม่มีบันทึกการชำระเงิน",
    note: "หมายเหตุ",
    from: "จาก",
    gas: "ค่าน้ำมัน",
    parking: "ค่าจอดรถ",
    amount: "จำนวน",
    monthlySummary: "สรุปรายเดือน",
    summary: "สรุป",
    day: "วัน",
    month: "เดือน",
    year: "ปี",
    noCostsThisMonth: "ยังไม่มีค่าใช้จ่ายเดือนนี้",
    noCostsToday: "ยังไม่มีค่าใช้จ่ายวันนี้",
    noCostsThisYear: "ยังไม่มีค่าใช้จ่ายปีนี้",
    noData: "ไม่มีข้อมูล",
    passenger: "ผู้โดยสาร",
    pending: "ค้างจ่าย",
    you: "คุณ",
    enterDailyCosts: "บันทึกค่าใช้จ่ายรายวัน",
    gasCost: "ค่าน้ำมัน (฿)",
    parkingCost: "ค่าจอดรถ (฿)",
    saving: "กำลังบันทึก...",
    saved: "บันทึกแล้ว!",
    saveCosts: "บันทึกค่าใช้จ่าย",
    failedToSave: "บันทึกไม่สำเร็จ กรุณาลองใหม่",
    confirmSaveCostsTitle: "บันทึกค่าใช้จ่ายนี้?",
    costReminderBanner: "คุณมีค่าใช้จ่ายที่ยังไม่ได้บันทึก — เลื่อนลงเพื่อบันทึก",
    missingDates: "วันที่ยังไม่ได้บันทึก",
    defaultGasCost: "ค่าน้ำมันเริ่มต้น (฿)",
    editCosts: "แก้ไข",
    costsSaved: "บันทึกค่าใช้จ่ายแล้ว",
    history: "ประวัติ",
    recent: "ล่าสุด",
    trips: "การเดินทาง",
    payments: "การชำระเงิน",
    viewAll: "ดูทั้งหมด",

    // Admin
    settings: "ตั้งค่า",
    qrCode: "QR Code",
    userManagement: "จัดการผู้ใช้",
    pendingApproval: "รอการอนุมัติ",
    approve: "อนุมัติ",
    noPendingUsers: "ไม่มีผู้ใช้ที่รอการอนุมัติ",
    activeUsers: "ผู้ใช้งาน",
    noName: "ไม่มีชื่อ",
    revoke: "เพิกถอน",
    deleteUser: "ลบ",
    confirmDeleteUser: "ลบผู้ใช้นี้? การเดินทาง การชำระเงิน และรถที่เป็นเจ้าของทั้งหมดจะถูกลบอย่างถาวร",
    costManagement: "จัดการค่าใช้จ่าย",
    debtSettlement: "ชำระหนี้",
    allBalancesCleared: "ยอดทั้งหมดเคลียร์แล้ว",
    clearFullBalance: "เคลียร์ยอดทั้งหมด",
    customAmount: "จำนวนเงิน (฿)",
    recordPayment: "บันทึกการชำระเงิน",
    operatingDays: "วันทำการ",
    selectDate: "เลือกวันที่",
    reason: "เหตุผล (ไม่บังคับ)",
    disableDate: "ปิดวันทำการ",
    disabledDatesUpcoming: "วันที่ปิด (ที่จะถึง)",
    reEnable: "เปิดใหม่",
    noDisabledDates: "ไม่มีวันที่ถูกปิด ระบบทำงานปกติ",

    // Car Management
    carManagement: "จัดการรถ",
    addCar: "เพิ่มรถ",
    carName: "ชื่อรถ",
    licensePlate: "ทะเบียนรถ (ไม่บังคับ)",
    owner: "เจ้าของ",
    selectOwner: "เลือกเจ้าของ",
    adding: "กำลังเพิ่ม...",
    noCars: "ยังไม่มีรถลงทะเบียน",
    deleteCar: "ลบ",
    confirmDeleteCar: "ลบรถนี้? ข้อมูลการเดินทางและค่าใช้จ่ายทั้งหมดจะหายไป",

    // QR
    qrCodeCheckin: "เช็คอินด้วย QR Code",
    qrDescription: "แสดง QR Code นี้ให้ผู้โดยสารที่ไม่สามารถแตะ NFC",
    back: "กลับ",
    noCarsRegistered: "คุณยังไม่มีรถลงทะเบียน",
    selectCar: "เลือกรถ",
    qrScanInstructions: "ผู้โดยสารสแกน QR Code นี้ด้วยกล้องมือถือเพื่อเช็คอิน ทำงานเหมือนกับสติ๊กเกอร์ NFC",
    viewTapUrl: "ดู URL สำหรับแตะ",

    // Tap Success
    rideLogged: "บันทึกเรียบร้อย!",
    rideRecorded: "ถูกบันทึกแล้ว",
    alreadyRecorded: "บันทึกแล้ว",
    alreadyRecordedDesc: "ถูกบันทึกไว้แล้ว ไม่สร้างซ้ำ",
    tooSoon: "เร็วเกินไปสำหรับเย็น",
    tooSoonDesc: "ยังไม่ถึงเวลาจากการแตะเช้า ลองใหม่ทีหลัง",
    systemDisabled: "ระบบปิดอยู่",
    systemDisabledDesc: "ระบบ Carpool ปิดสำหรับวันนี้",
    tapReceived: "รับการแตะแล้ว",
    tapProcessed: "การแตะของคุณถูกประมวลผลแล้ว",

    // Pending Approval
    pendingApprovalTitle: "รอการอนุมัติ",
    pendingApprovalDesc: "บัญชีของคุณกำลังรอการอนุมัติจากแอดมิน คุณจะสามารถใช้ระบบ Carpool ได้หลังจากได้รับการอนุมัติ",
    signedInAs: "เข้าสู่ระบบในชื่อ",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.en;
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return "en";
  const lang = acceptLanguage.toLowerCase();
  if (lang.startsWith("th")) return "th";
  return "en";
}

/** Get the BCP 47 locale string with Buddhist calendar for Thai */
export function dateLocale(locale: Locale): string {
  return locale === "th" ? "th-TH-u-ca-buddhist" : "en-US";
}

const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/**
 * Server-safe date formatting that guarantees Buddhist Era for Thai.
 * Node.js may lack full ICU data, so we manually add 543 years for Thai.
 */
export function formatDateShort(date: Date, locale: Locale): string {
  if (locale === "th") {
    const d = date.getDate();
    const m = thMonths[date.getMonth()];
    const y = date.getFullYear() + 543;
    return `${d} ${m} ${y}`;
  }
  return date.toLocaleDateString("en-US");
}

/** Format a date with full weekday, day, month, year (Buddhist Era for Thai) */
export function formatDateFull(date: Date, locale: Locale): string {
  return date.toLocaleDateString(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Format a date as short date (day/month/year with Buddhist Era for Thai) */
export function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(dateLocale(locale));
}
