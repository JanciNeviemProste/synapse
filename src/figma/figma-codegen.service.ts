import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

interface FigmaNodeData {
  id: string;
  name: string;
  type: string;
  children?: FigmaNodeData[];
  fills?: FigmaFillData[];
  strokes?: FigmaStrokeData[];
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: Record<string, unknown>;
  characters?: string;
  [key: string]: unknown;
}

interface FigmaFillData {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  imageRef?: string;
}

interface FigmaStrokeData {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
}

interface DesignDescriptor {
  element: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string | null;
  borderRadius: string | null;
  borderColor: string | null;
  text: string | null;
  children: DesignDescriptor[];
}

const FIGMA_CODEGEN_PROMPT = `You are an expert frontend developer specializing in converting Figma designs to pixel-perfect HTML/CSS.

You will receive a design descriptor (JSON) and a screenshot of the Figma design. Generate a complete, production-ready single HTML file that faithfully reproduces the design.

REQUIREMENTS:
- Output a single HTML file with embedded CSS and JavaScript
- Match the design as closely as possible — colors, spacing, typography, layout
- Use Lucide Icons (https://unpkg.com/lucide@latest) for all icons — NEVER use emoji as icons
- Use high-quality photos from Unsplash (https://source.unsplash.com/random/WIDTHxHEIGHT/?QUERY) where image placeholders exist
- Use Google Fonts for typography — match the fonts from the design or choose close alternatives
- Implement responsive design with CSS Grid and Flexbox
- Add smooth transitions and micro-interactions (hover effects, scroll animations)
- Use proper semantic HTML5 elements
- Ensure accessibility (ARIA labels, alt text, proper heading hierarchy)
- No placeholder text — generate realistic content that matches the design context
- No external CSS frameworks — write custom CSS
- Clean, well-structured, production-ready code

OUTPUT: Return ONLY the complete HTML file content, no markdown fences, no explanation.`;

@Injectable()
export class FigmaCodegenService {
  private readonly logger = new Logger(FigmaCodegenService.name);

  constructor(private aiService: AiService) {}

  async generateCode(
    nodeData: FigmaNodeData,
    screenshotUrl: string,
  ): Promise<string> {
    try {
      const descriptor = this.buildDesignDescriptor(nodeData);
      const descriptorJson = JSON.stringify(descriptor, null, 2);

      const userMessage = `Design descriptor:\n${descriptorJson}\n\nPlease generate the HTML/CSS code that faithfully reproduces this design.`;

      const generatedCode = await this.aiService.analyzeImage(
        FIGMA_CODEGEN_PROMPT,
        screenshotUrl,
        userMessage,
      );

      const cleanedCode = generatedCode
        .replace(/^```html\n?/g, '')
        .replace(/^```\n?/g, '')
        .replace(/\n?```$/g, '')
        .trim();

      this.logger.log(
        `Generated ${cleanedCode.length} chars of HTML from Figma node ${nodeData.id}`,
      );

      return cleanedCode;
    } catch (error) {
      this.logger.error(
        'Figma code generation failed',
        (error as Error).message,
      );
      throw error;
    }
  }

  private buildDesignDescriptor(node: FigmaNodeData): DesignDescriptor {
    const bbox = node.absoluteBoundingBox;
    const width = bbox?.width || 0;
    const height = bbox?.height || 0;

    let backgroundColor: string | null = null;
    if (node.fills && node.fills.length > 0) {
      const solidFill = node.fills.find((f) => f.type === 'SOLID' && f.color);
      if (solidFill?.color) {
        backgroundColor = this.rgbaToCSS(solidFill.color);
      }
    }

    let borderRadius: string | null = null;
    if (node.cornerRadius) {
      borderRadius = `${node.cornerRadius}px`;
    } else if (
      node.rectangleCornerRadii &&
      node.rectangleCornerRadii.length === 4
    ) {
      borderRadius = node.rectangleCornerRadii.map((r) => `${r}px`).join(' ');
    }

    let borderColor: string | null = null;
    if (node.strokes && node.strokes.length > 0) {
      const solidStroke = node.strokes.find(
        (s) => s.type === 'SOLID' && s.color,
      );
      if (solidStroke?.color) {
        borderColor = this.rgbaToCSS(solidStroke.color);
      }
    }

    const text = node.characters || null;

    const children: DesignDescriptor[] = [];
    if (node.children) {
      for (const child of node.children) {
        children.push(this.buildDesignDescriptor(child));
      }
    }

    return {
      element: node.type,
      name: node.name,
      width,
      height,
      backgroundColor,
      borderRadius,
      borderColor,
      text,
      children,
    };
  }

  private rgbaToCSS(color: {
    r: number;
    g: number;
    b: number;
    a: number;
  }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = Math.round(color.a * 100) / 100;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
