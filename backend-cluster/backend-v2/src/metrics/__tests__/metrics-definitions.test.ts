import "reflect-metadata";
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestInProgress,
  graphqlQueryDuration,
  graphqlQueryTotal,
  graphqlQueryInProgress,
  memoryUsage,
  cpuUsage,
} from "../metrics-definitions";
import { Counter, Histogram, Gauge } from "prom-client";

describe("Metrics Definitions", () => {
  describe("HTTP Request Metrics", () => {
    it("should export httpRequestDuration as a Histogram", () => {
      expect(httpRequestDuration).toBeInstanceOf(Histogram);
    });

    it("should export httpRequestTotal as a Counter", () => {
      expect(httpRequestTotal).toBeInstanceOf(Counter);
    });

    it("should export httpRequestInProgress as a Gauge", () => {
      expect(httpRequestInProgress).toBeInstanceOf(Gauge);
    });
  });

  describe("GraphQL Query Metrics", () => {
    it("should export graphqlQueryDuration as a Histogram", () => {
      expect(graphqlQueryDuration).toBeInstanceOf(Histogram);
    });

    it("should export graphqlQueryTotal as a Counter", () => {
      expect(graphqlQueryTotal).toBeInstanceOf(Counter);
    });

    it("should export graphqlQueryInProgress as a Gauge", () => {
      expect(graphqlQueryInProgress).toBeInstanceOf(Gauge);
    });
  });

  describe("System Metrics", () => {
    it("should export memoryUsage as a Gauge", () => {
      expect(memoryUsage).toBeInstanceOf(Gauge);
    });

    it("should export cpuUsage as a Gauge", () => {
      expect(cpuUsage).toBeInstanceOf(Gauge);
    });
  });

  describe("Metric Availability", () => {
    it("should have all required HTTP metrics defined", () => {
      expect(httpRequestDuration).toBeDefined();
      expect(httpRequestTotal).toBeDefined();
      expect(httpRequestInProgress).toBeDefined();
    });

    it("should have all required GraphQL metrics defined", () => {
      expect(graphqlQueryDuration).toBeDefined();
      expect(graphqlQueryTotal).toBeDefined();
      expect(graphqlQueryInProgress).toBeDefined();
    });

    it("should have all required system metrics defined", () => {
      expect(memoryUsage).toBeDefined();
      expect(cpuUsage).toBeDefined();
    });
  });
});
