const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
        WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak } = require('docx');
const fs = require('fs');

// Helper function for creating table cells
const createCell = (text, isHeader = false, width = 2340) => {
  const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  return new TableCell({
    borders: { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder },
    width: { size: width, type: WidthType.DXA },
    shading: isHeader ? { fill: "1E3A5F", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
      children: [new TextRun({
        text: text,
        bold: isHeader,
        color: isHeader ? "FFFFFF" : "000000",
        size: isHeader ? 22 : 20,
        font: "Arial"
      })]
    })]
  });
};

// Create the document
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: "1E3A5F", font: "Arial" },
        paragraph: { spacing: { before: 0, after: 200 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1E3A5F", font: "Arial" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "2E5A8F", font: "Arial" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "3E7ABF", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      { id: "Code", name: "Code Block", basedOn: "Normal",
        run: { size: 18, font: "Consolas", color: "2E5A8F" },
        paragraph: { spacing: { before: 100, after: 100 }, indent: { left: 360 } } }
    ]
  },
  numbering: {
    config: [
      { reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbered-list",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "flow-list",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
    ]
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Agrinova - Authentication Documentation", italics: true, size: 20, color: "666666" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", size: 20 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 20 }),
          new TextRun({ text: " of ", size: 20 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 20 })
        ]
      })] })
    },
    children: [
      // Title Page
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("AGRINOVA")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "Authentication System Documentation", size: 36, color: "666666" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Web Login vs Mobile Login", size: 28, color: "888888" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1000 },
        children: [new TextRun({ text: "Version 1.0 | December 2025", size: 22, color: "999999" })]
      }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // Table of Contents Header
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("Overview")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("Web Login (Cookie-based)")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("Mobile Login (JWT-based)")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("Comparison Table")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("GraphQL Schema")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("Security Features")] }),
      new Paragraph({ numbering: { reference: "numbered-list", level: 0 }, children: [new TextRun("Backend File Structure")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 1: Overview
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Overview")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("Agrinova uses a dual authentication system to support both web and mobile platforms through a single GraphQL endpoint. The system implements:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "Web: ", bold: true }), new TextRun("Cookie-based session authentication")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "Mobile: ", bold: true }), new TextRun("JWT-based token authentication with device binding")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Key Differences")] }),
      new Table({
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({ children: [createCell("Aspect", true, 3120), createCell("Web", true, 3120), createCell("Mobile", true, 3120)] }),
          new TableRow({ children: [createCell("Mutation", false, 3120), createCell("webLogin", false, 3120), createCell("mobileLogin", false, 3120)] }),
          new TableRow({ children: [createCell("Auth Method", false, 3120), createCell("Cookie (HttpOnly)", false, 3120), createCell("Bearer Token", false, 3120)] }),
          new TableRow({ children: [createCell("Device Binding", false, 3120), createCell("No", false, 3120), createCell("Yes (required)", false, 3120)] }),
          new TableRow({ children: [createCell("Offline Support", false, 3120), createCell("No", false, 3120), createCell("Yes (30 days)", false, 3120)] }),
          new TableRow({ children: [createCell("CSRF Protection", false, 3120), createCell("Yes", false, 3120), createCell("Not needed", false, 3120)] }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 2: Web Login
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Web Login (Cookie-based)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 GraphQL Input")] }),
      new Paragraph({ style: "Code", children: [new TextRun("input WebLoginInput {")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  identifier: String!  # username or email")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  password: String!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("}")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Response Payload")] }),
      new Paragraph({ style: "Code", children: [new TextRun("type WebLoginPayload {")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  success: Boolean!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  user: User")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  assignments: UserAssignments")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  sessionId: String")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  message: String!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("}")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Cookies Set by Server")] }),
      new Table({
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [
          new TableRow({ children: [createCell("Cookie Name", true), createCell("HttpOnly", true), createCell("Secure", true), createCell("Purpose", true)] }),
          new TableRow({ children: [createCell("session_id"), createCell("Yes"), createCell("Yes"), createCell("Session token")] }),
          new TableRow({ children: [createCell("csrf_token"), createCell("No"), createCell("Yes"), createCell("CSRF protection")] }),
        ]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4 Authentication Flow")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("User submits credentials via LoginForm")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("CookieAuthService.login() validates and calls API")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("Apollo Client executes WEB_LOGIN_MUTATION")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("Backend validates credentials with bcrypt")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("Session created in database")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("HttpOnly cookies set in response")] }),
      new Paragraph({ numbering: { reference: "flow-list", level: 0 }, children: [new TextRun("User redirected to role-based dashboard")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 3: Mobile Login
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Mobile Login (JWT-based)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 GraphQL Input")] }),
      new Paragraph({ style: "Code", children: [new TextRun("input MobileLoginInput {")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  identifier: String!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  password: String!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  platform: PlatformType!  # ANDROID, IOS")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  deviceId: String")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  deviceFingerprint: String")] }),
      new Paragraph({ style: "Code", children: [new TextRun("}")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Response Payload (AuthPayload)")] }),
      new Paragraph({ style: "Code", children: [new TextRun("type AuthPayload {")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  accessToken: String!     # 15 minutes")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  refreshToken: String!    # 7 days")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  offlineToken: String     # 30 days")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  tokenType: String!       # \"Bearer\"")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  expiresIn: Int!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  expiresAt: Time!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  user: User!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  assignments: UserAssignments!")] }),
      new Paragraph({ style: "Code", children: [new TextRun("}")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 Token Types")] }),
      new Table({
        columnWidths: [2340, 2340, 4680],
        rows: [
          new TableRow({ children: [createCell("Token", true), createCell("Lifetime", true), createCell("Purpose", true, 4680)] }),
          new TableRow({ children: [createCell("Access Token"), createCell("15 minutes"), createCell("API authentication", false, 4680)] }),
          new TableRow({ children: [createCell("Refresh Token"), createCell("7 days"), createCell("Renew access token", false, 4680)] }),
          new TableRow({ children: [createCell("Offline Token"), createCell("30 days"), createCell("Offline mode for MANDOR/SATPAM", false, 4680)] }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 4: Security Comparison
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Security Features Comparison")] }),
      new Table({
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({ children: [createCell("Security Feature", true, 3120), createCell("Web", true, 3120), createCell("Mobile", true, 3120)] }),
          new TableRow({ children: [createCell("XSS Protection", false, 3120), createCell("HttpOnly cookies", false, 3120), createCell("Secure storage", false, 3120)] }),
          new TableRow({ children: [createCell("CSRF Protection", false, 3120), createCell("CSRF token", false, 3120), createCell("Not needed", false, 3120)] }),
          new TableRow({ children: [createCell("Device Verification", false, 3120), createCell("IP + User-Agent", false, 3120), createCell("Device ID + Fingerprint", false, 3120)] }),
          new TableRow({ children: [createCell("Rate Limiting", false, 3120), createCell("IP-based", false, 3120), createCell("Device-based", false, 3120)] }),
          new TableRow({ children: [createCell("Session Hijacking", false, 3120), createCell("Session bound to IP", false, 3120), createCell("Token bound to device", false, 3120)] }),
          new TableRow({ children: [createCell("Token Revocation", false, 3120), createCell("Revoke session", false, 3120), createCell("Revoke in database", false, 3120)] }),
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 5: Middleware Stack
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Middleware Stack")] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun("Both platforms share a single GraphQL endpoint with layered middleware:")] }),

      new Table({
        columnWidths: [1200, 3600, 4560],
        rows: [
          new TableRow({ children: [createCell("Order", true, 1200), createCell("Middleware", true, 3600), createCell("Description", true, 4560)] }),
          new TableRow({ children: [createCell("1", false, 1200), createCell("CORS Middleware", false, 3600), createCell("Validates Origin, sets credentials header", false, 4560)] }),
          new TableRow({ children: [createCell("2", false, 1200), createCell("JWT Auth Middleware", false, 3600), createCell("MOBILE ONLY - validates Bearer token", false, 4560)] }),
          new TableRow({ children: [createCell("3", false, 1200), createCell("Web Session Middleware", false, 3600), createCell("WEB ONLY - validates session cookie", false, 4560)] }),
          new TableRow({ children: [createCell("4", false, 1200), createCell("GraphQL Context", false, 3600), createCell("Adds HTTP context for cookies", false, 4560)] }),
          new TableRow({ children: [createCell("5", false, 1200), createCell("RLS Middleware", false, 3600), createCell("PostgreSQL Row-Level Security", false, 4560)] }),
          new TableRow({ children: [createCell("6", false, 1200), createCell("GraphQL Handler", false, 3600), createCell("Executes query/mutation", false, 4560)] }),
        ]
      }),

      new Paragraph({
        spacing: { before: 200 },
        shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
        children: [new TextRun({ text: "Note: ", bold: true }), new TextRun("JWT middleware skips if no Bearer token (web requests). Web Session middleware skips if no cookie (mobile requests).")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 6: File Structure
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Backend File Structure")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Web Authentication")] }),
      new Paragraph({ style: "Code", children: [new TextRun("apps/golang/internal/auth/features/web/")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  application/service.go       # WebAuthService.Login()")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  infrastructure/cookie_service.go  # SetAuthCookies()")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  interfaces/graphql/resolver.go    # WebLogin resolver")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 Mobile Authentication")] }),
      new Paragraph({ style: "Code", children: [new TextRun("apps/golang/internal/auth/features/mobile/")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  application/service.go       # MobileAuthService.Login()")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  infrastructure/jwt_service.go    # GenerateTokenPair()")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  interfaces/graphql/resolver.go   # MobileLogin resolver")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 Shared Components")] }),
      new Paragraph({ style: "Code", children: [new TextRun("apps/golang/internal/auth/")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  resolvers/auth_resolver.go   # Routes to web/mobile")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  features/shared/             # User, Session, Device models")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.4 Middleware")] }),
      new Paragraph({ style: "Code", children: [new TextRun("apps/golang/internal/middleware/")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  auth.go          # JWT middleware (mobile)")] }),
      new Paragraph({ style: "Code", children: [new TextRun("  web_auth.go      # Session middleware (web)")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 7: Error Handling
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Error Handling")] }),
      new Table({
        columnWidths: [4680, 2340, 2340],
        rows: [
          new TableRow({ children: [createCell("Error", true, 4680), createCell("Web", true), createCell("Mobile", true)] }),
          new TableRow({ children: [createCell("Invalid credentials", false, 4680), createCell("ErrInvalidCredentials"), createCell("ErrInvalidCredentials")] }),
          new TableRow({ children: [createCell("User not found", false, 4680), createCell("ErrUserNotFound"), createCell("ErrUserNotFound")] }),
          new TableRow({ children: [createCell("Session/Token expired", false, 4680), createCell("ErrInvalidSession"), createCell("ErrInvalidToken")] }),
          new TableRow({ children: [createCell("Rate limit exceeded", false, 4680), createCell("HTTP 429"), createCell("HTTP 429")] }),
          new TableRow({ children: [createCell("No assignments", false, 4680), createCell("-"), createCell("ErrNoAssignments")] }),
          new TableRow({ children: [createCell("Device fingerprint mismatch", false, 4680), createCell("-"), createCell("ErrDeviceFingerprintMismatch")] }),
        ]
      }),

      // Summary
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. Summary")] }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun("The Agrinova authentication system provides:")]
      }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "Web: ", bold: true }), new TextRun("Cookie-based sessions with HttpOnly protection, CSRF tokens, and IP-based rate limiting")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "Mobile: ", bold: true }), new TextRun("JWT tokens with device binding, offline support, and fingerprint verification")] }),
      new Paragraph({ numbering: { reference: "bullet-list", level: 0 }, children: [new TextRun({ text: "Shared: ", bold: true }), new TextRun("Single GraphQL endpoint, PostgreSQL RLS for multi-tenancy, role-based access control")] }),

      new Paragraph({
        spacing: { before: 400 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "--- End of Document ---", italics: true, color: "999999" })]
      }),
    ]
  }]
});

// Generate and save the document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("E:/agrinova/docs/Agrinova_Login_Documentation.docx", buffer);
  console.log("Document created successfully: E:/agrinova/docs/Agrinova_Login_Documentation.docx");
}).catch(err => {
  console.error("Error creating document:", err);
});
