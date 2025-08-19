// Mock for d3-selection module for testing
export const select = (selector: any) => ({
  selectAll: () => ({
    data: () => ({
      enter: () => ({
        append: () => ({
          attr: () => ({}),
          style: () => ({}),
          text: () => ({}),
          call: () => ({}),
        }),
      }),
      exit: () => ({
        remove: () => ({}),
      }),
      attr: () => ({}),
      style: () => ({}),
      text: () => ({}),
      call: () => ({}),
    }),
  }),
  append: () => ({
    attr: () => ({}),
    style: () => ({}),
    call: () => ({}),
  }),
  attr: () => ({}),
  style: () => ({}),
  call: () => ({}),
  node: () => ({
    getBoundingClientRect: () => ({
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
    }),
  }),
});

export const selectAll = (selector: any) => ({
  data: () => ({
    enter: () => ({
      append: () => ({
        attr: () => ({}),
        style: () => ({}),
        text: () => ({}),
        call: () => ({}),
      }),
    }),
    exit: () => ({
      remove: () => ({}),
    }),
    attr: () => ({}),
    style: () => ({}),
    text: () => ({}),
    call: () => ({}),
  }),
});