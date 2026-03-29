import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Shield,
  TrendingUp,
  Users,
  Zap,
  Target,
  Award,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { useLocation } from "wouter";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480481606/mSbbvEPZCkmEtZbYVdHD74/LogodeWVTransportControl(1)_686a838d.png";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <img
                src={LOGO_URL}
                alt="WV Transport Control"
                className="w-32 h-32 object-contain mb-6"
              />
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                WV Transport, LLC
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Soluciones integrales de transporte y logística con tecnología de punta
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => setLocation("/")}
                  className="bg-primary hover:bg-primary/90"
                >
                  Ir al Panel
                </Button>
                <Button variant="outline">Contactar Ventas</Button>
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Nuestra Misión
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Proporcionar soluciones de transporte y logística confiables, eficientes y
                  tecnológicamente avanzadas que permitan a nuestros clientes optimizar sus
                  operaciones y maximizar sus ganancias.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
          Nuestros Valores
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Shield,
              title: "Confiabilidad",
              description:
                "Comprometidos con la excelencia y la transparencia en cada operación",
            },
            {
              icon: Zap,
              title: "Eficiencia",
              description:
                "Optimizamos procesos para maximizar resultados y minimizar costos",
            },
            {
              icon: TrendingUp,
              title: "Crecimiento",
              description:
                "Impulsamos el desarrollo continuo de nuestro equipo y servicios",
            },
            {
              icon: Users,
              title: "Colaboración",
              description:
                "Trabajamos juntos para alcanzar objetivos comunes y compartidos",
            },
          ].map((value, idx) => (
            <Card
              key={idx}
              className="bg-card border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <value.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">
                {value.title}
              </h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="bg-card border-y border-border py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Nuestros Servicios
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Truck,
                title: "Transporte de Carga",
                description:
                  "Servicio de transporte confiable para todo tipo de mercancías con cobertura nacional",
              },
              {
                icon: Target,
                title: "Logística Integrada",
                description:
                  "Soluciones completas de logística desde pickup hasta entrega final",
              },
              {
                icon: TrendingUp,
                title: "Análisis y Reportes",
                description:
                  "Reportes detallados y análisis en tiempo real para optimizar operaciones",
              },
              {
                icon: Shield,
                title: "Seguridad y Rastreo",
                description:
                  "Monitoreo GPS en tiempo real y seguimiento completo de envíos",
              },
              {
                icon: Zap,
                title: "Automatización",
                description:
                  "Sistemas automatizados para mejorar eficiencia y reducir errores",
              },
              {
                icon: Award,
                title: "Consultoría",
                description:
                  "Asesoramiento experto para optimizar tu operación de transporte",
              },
            ].map((service, idx) => (
              <Card
                key={idx}
                className="bg-background border border-border p-6 hover:border-primary transition-colors"
              >
                <service.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {service.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
          Nuestro Equipo
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              name: "Wascar Ortiz",
              role: "Fundador & CEO",
              bio: "Líder con más de 15 años de experiencia en transporte y logística",
            },
            {
              name: "Equipo de Operaciones",
              role: "Gestión de Flota",
              bio: "Profesionales dedicados a optimizar cada operación diaria",
            },
            {
              name: "Equipo Técnico",
              role: "Desarrollo & Soporte",
              bio: "Expertos en tecnología comprometidos con la innovación continua",
            },
          ].map((member, idx) => (
            <Card
              key={idx}
              className="bg-card border border-border p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">
                {member.name}
              </h3>
              <p className="text-sm text-primary font-semibold mb-3">
                {member.role}
              </p>
              <p className="text-sm text-muted-foreground">{member.bio}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-y border-border py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
            Contacto
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Ubicación",
                content: "WV Transport, LLC\nEstados Unidos",
              },
              {
                icon: Phone,
                title: "Teléfono",
                content: "Disponible en el panel de control",
              },
              {
                icon: Mail,
                title: "Email",
                content: "contacto@wvtransport.com",
              },
            ].map((contact, idx) => (
              <Card
                key={idx}
                className="bg-card border border-border p-6 text-center"
              >
                <contact.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {contact.title}
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {contact.content}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">
          Por los Números
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { number: "500+", label: "Cargas Completadas" },
            { number: "50+", label: "Conductores Activos" },
            { number: "99.8%", label: "Tasa de Entrega" },
            { number: "24/7", label: "Soporte Disponible" },
          ].map((stat, idx) => (
            <Card
              key={idx}
              className="bg-card border border-border p-6 text-center hover:border-primary transition-colors"
            >
              <p className="text-4xl font-bold text-primary mb-2">
                {stat.number}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            ¿Listo para Optimizar tu Operación?
          </h2>
          <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya confían en WV Control Center para
            gestionar sus operaciones de transporte y logística.
          </p>
          <Button
            onClick={() => setLocation("/")}
            className="bg-white text-primary hover:bg-white/90"
          >
            Acceder al Panel de Control
          </Button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 WV Transport, LLC. Todos los derechos reservados.</p>
          <p className="mt-2">
            WV Control Center - Soluciones Integrales de Transporte y Logística
          </p>
        </div>
      </div>
    </div>
  );
}
